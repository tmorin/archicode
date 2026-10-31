package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The writer of a fold, on a temporary folder (wave 028, run 0208, DEC-5): all of the files or none, whichever operation
 * fails, and a file changed since it was read stops the write before the first byte.
 */
class FoldFilesTest {

    @TempDir
    Path folder;

    /** The production operations, failing at the nth call of one of them (1-based), or never. */
    private static final class Failing implements FoldFiles {

        private final FoldFiles real = FoldFiles.disk();
        private final String operation;
        private final int at;
        private final List<String> calls = new ArrayList<>();
        private final java.util.Set<String> failOnRestore = new java.util.HashSet<>();
        private boolean failOnStagedDelete;
        private String reason = "disk full";

        Failing(String operation, int at) {
            this.operation = operation;
            this.at = at;
        }

        private void maybe(String op, Path file) throws IOException {
            calls.add(op + " " + file.getFileName());
            val count = calls
                .stream()
                .filter(c -> c.startsWith(op + " "))
                .count();
            if (op.equals(operation) && count == at) {
                throw new IOException(reason);
            }
        }

        @Override
        public byte[] read(Path file) throws IOException {
            return real.read(file);
        }

        @Override
        public Path stage(Path target, byte[] bytes) throws IOException {
            maybe("stage", target);
            return real.stage(target, bytes);
        }

        @Override
        public void move(Path staged, Path target) throws IOException {
            maybe("move", target);
            real.move(staged, target);
        }

        @Override
        public void delete(Path file) throws IOException {
            if (failOnStagedDelete && file.getFileName().toString().endsWith(".archicode-fold")) {
                throw new IOException("cannot remove");
            }
            maybe("delete", file);
            real.delete(file);
        }

        @Override
        public void restore(Path file, byte[] bytes) throws IOException {
            if (failOnRestore.contains(file.getFileName().toString())) {
                throw new IOException("read-only");
            }
            real.restore(file, bytes);
        }
    }

    @SneakyThrows
    private void write(String name, String text) {
        val file = folder.resolve(name);
        Files.createDirectories(file.getParent());
        Files.writeString(file, text);
    }

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    /** Every file of the folder, hidden ones included, with its bytes. */
    @SneakyThrows
    private Map<String, String> snapshot() {
        val out = new TreeMap<String, String>();
        try (Stream<Path> all = Files.walk(folder)) {
            for (val p : all.filter(Files::isRegularFile).toList()) {
                out.put(folder.relativize(p).toString(), Files.readString(p));
            }
        }
        return out;
    }

    private Map<String, byte[]> read() {
        val out = new LinkedHashMap<String, byte[]>();
        out.put("a/x.yaml", bytes("x0"));
        out.put("a/y.yaml", bytes("y0"));
        out.put("b/plateau.yaml", bytes("b0"));
        out.put("a/plateau.yaml", bytes("folded0"));
        return out;
    }

    private Map<String, byte[]> written() {
        val out = new LinkedHashMap<String, byte[]>();
        out.put("a/x.yaml", bytes("x1"));
        out.put("a/y.yaml", bytes("y1"));
        out.put("b/plateau.yaml", bytes("b1"));
        return out;
    }

    private void layout() {
        write("a/x.yaml", "x0");
        write("a/y.yaml", "y0");
        write("b/plateau.yaml", "b0");
        write("a/plateau.yaml", "folded0");
        write(".archicode.yaml", "settings: {}");
        write(".hidden/keep", "keep");
    }

    private void commit(FoldFiles files) {
        FoldFiles.commit(files, folder, read(), written(), List.of("a/plateau.yaml"));
    }

    @Test
    void shouldWriteEveryFileAndDeleteTheFoldedManifestLast() {
        layout();
        val files = new Failing("none", 0);

        commit(files);

        assertEquals("x1", snapshot().get("a/x.yaml"));
        assertEquals("y1", snapshot().get("a/y.yaml"));
        assertEquals("b1", snapshot().get("b/plateau.yaml"));
        assertFalse(snapshot().containsKey("a/plateau.yaml"));
        assertEquals("keep", snapshot().get(".hidden/keep"));
        assertEquals("delete plateau.yaml", files.calls.get(files.calls.size() - 1));
        assertTrue(
            snapshot()
                .keySet()
                .stream()
                .noneMatch(n -> n.endsWith(".archicode-fold"))
        );
    }

    @Test
    void shouldLeaveTheFolderAsItWasWhicheverOperationFails() {
        for (val failure : List.of(
            new String[] { "stage", "1" },
            new String[] { "stage", "2" },
            new String[] { "stage", "3" },
            new String[] { "move", "1" },
            new String[] { "move", "2" },
            new String[] { "move", "3" },
            new String[] { "delete", "1" }
        )) {
            layout();
            val before = snapshot();

            val error = assertThrows(ArchiCodeException.class, () ->
                commit(new Failing(failure[0], Integer.parseInt(failure[1])))
            );

            assertEquals(before, snapshot(), failure[0] + " " + failure[1]);
            assertTrue(error.getMessage().startsWith("the fold stopped at `"), error.getMessage());
            assertTrue(error.getMessage().endsWith("every file is as it was"), error.getMessage());
            assertTrue(error.getMessage().contains("disk full"), error.getMessage());
            TestFolders.clear(folder);
        }
    }

    @Test
    void shouldStopBeforeTheFirstWriteWhenAFileChangedSinceItWasRead() {
        layout();
        write("b/plateau.yaml", "edited by someone else");
        val before = snapshot();
        val files = new Failing("none", 0);

        val error = assertThrows(ArchiCodeException.class, () -> commit(files));

        assertEquals(
            "`b/plateau.yaml` changed while the fold was prepared: no file is written, run the command again",
            error.getMessage()
        );
        assertEquals(before, snapshot());
        assertEquals(List.of(), files.calls);
    }

    @Test
    void shouldStopWhenAFileToDeleteChangedSinceItWasRead() {
        layout();
        write("a/plateau.yaml", "edited");

        val error = assertThrows(ArchiCodeException.class, () -> commit(new Failing("none", 0)));

        assertTrue(error.getMessage().startsWith("`a/plateau.yaml` changed while the fold was prepared"));
    }

    @Test
    void shouldListTheFilesItCouldNotPutBack() {
        layout();
        val files = new Failing("delete", 1);
        files.failOnRestore.add("x.yaml");
        files.failOnRestore.add("y.yaml");

        val error = assertThrows(ArchiCodeException.class, () -> commit(files));

        assertEquals(
            "the fold stopped at `a/plateau.yaml` (disk full) and could not put back `a/x.yaml`, `a/y.yaml`: " +
                "they may be partly written, restore them with git",
            error.getMessage()
        );
    }

    @Test
    void shouldStopWhenAFileToRewriteIsGone() throws IOException {
        layout();
        Files.delete(folder.resolve("a/y.yaml"));
        val before = snapshot();

        val error = assertThrows(ArchiCodeException.class, () -> commit(new Failing("none", 0)));

        assertEquals(
            "`a/y.yaml` changed while the fold was prepared: no file is written, run the command again",
            error.getMessage()
        );
        assertEquals(before, snapshot());
    }

    @Test
    void shouldRefuseAPathThatWasNotRead() {
        layout();
        val read = read();
        read.remove("b/plateau.yaml");

        assertThrows(IllegalArgumentException.class, () ->
            FoldFiles.commit(new Failing("none", 0), folder, read, written(), List.of("a/plateau.yaml"))
        );
        assertThrows(IllegalArgumentException.class, () ->
            FoldFiles.commit(new Failing("none", 0), folder, read(), Map.of(), List.of("a/missing.yaml"))
        );
    }

    @Test
    void shouldStillSayWhatStoppedWhenAStagedFileCannotBeRemoved() {
        layout();
        val files = new Failing("stage", 3);
        files.failOnStagedDelete = true;

        val error = assertThrows(ArchiCodeException.class, () -> commit(files));

        assertEquals("the fold stopped at `b/plateau.yaml` (disk full): every file is as it was", error.getMessage());
        assertEquals("x0", snapshot().get("a/x.yaml"));
        assertEquals("b0", snapshot().get("b/plateau.yaml"));
    }

    @Test
    void shouldPutBackTheFilesChangedBeforeASecondDeleteFailed() {
        layout();
        write("a/other.yaml", "o0");
        val read = read();
        read.put("a/other.yaml", bytes("o0"));
        val before = snapshot();

        val error = assertThrows(ArchiCodeException.class, () ->
            FoldFiles.commit(
                new Failing("delete", 2),
                folder,
                read,
                written(),
                List.of("a/plateau.yaml", "a/other.yaml")
            )
        );

        assertEquals(before, snapshot());
        assertTrue(error.getMessage().startsWith("the fold stopped at `a/other.yaml` (disk full)"));
    }

    @Test
    void shouldNameTheFailureWhenTheReasonHasNoMessage() {
        layout();
        val files = new Failing("move", 1);
        files.reason = null;

        val error = assertThrows(ArchiCodeException.class, () -> commit(files));

        assertTrue(error.getMessage().contains("(IOException)"), error.getMessage());
    }

    @Test
    void shouldKeepASymbolicLinkAndWriteTheFileItPointsTo() throws IOException {
        layout();
        val real = folder.resolve("elsewhere/real.yaml");
        Files.createDirectories(real.getParent());
        Files.writeString(real, "x0");
        Files.delete(folder.resolve("a/x.yaml"));
        Files.createSymbolicLink(folder.resolve("a/x.yaml"), real);

        commit(new Failing("none", 0));

        assertTrue(Files.isSymbolicLink(folder.resolve("a/x.yaml")));
        assertEquals("x1", Files.readString(real));
    }

    @Test
    void shouldOverwriteAStaleStagedFile() throws IOException {
        layout();
        write("a/x.yaml.archicode-fold", "left by a crash");

        commit(new Failing("none", 0));

        assertEquals("x1", Files.readString(folder.resolve("a/x.yaml")));
        assertFalse(Files.exists(folder.resolve("a/x.yaml.archicode-fold")));
    }

    @Test
    void shouldKeepThePermissionsOfTheFile() throws IOException {
        layout();
        val target = folder.resolve("a/x.yaml");
        val permissions = java.nio.file.attribute.PosixFilePermissions.fromString("rw-r-----");
        Files.setPosixFilePermissions(target, permissions);

        commit(new Failing("none", 0));

        assertEquals(permissions, Files.getPosixFilePermissions(target));
    }

    @Test
    void shouldNotLeaveAStagedFileThatAManifestDiscoveryWouldRead() {
        layout();

        assertThrows(ArchiCodeException.class, () -> commit(new Failing("move", 2)));

        assertTrue(
            snapshot()
                .keySet()
                .stream()
                .noneMatch(n -> n.endsWith(".archicode-fold"))
        );
    }

    @Test
    void shouldStageNextToTheTargetOnTheDisk() throws IOException {
        layout();
        val files = FoldFiles.disk();

        val staged = files.stage(folder.resolve("a/x.yaml"), bytes("new"));

        assertEquals("x.yaml.archicode-fold", staged.getFileName().toString());
        assertArrayEquals(bytes("new"), Files.readAllBytes(staged));
        assertEquals("x0", Files.readString(folder.resolve("a/x.yaml")));
    }

    /** Clears the folder between the rounds of a loop. */
    private static final class TestFolders {

        @SneakyThrows
        static void clear(Path folder) {
            try (Stream<Path> all = Files.walk(folder)) {
                for (val p : all.sorted(java.util.Comparator.reverseOrder()).toList()) {
                    if (!p.equals(folder)) {
                        Files.delete(p);
                    }
                }
            }
        }
    }
}

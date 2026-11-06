package io.morin.archicode.importer;

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
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** The writer of an import, on a temporary folder: all of the files or none, whichever step fails. */
class ImportFilesTest {

    @TempDir
    Path root;

    /** The production operations, failing at the nth call of one of them (1-based), or never. */
    private static final class Failing implements ImportFiles {

        private final ImportFiles real = ImportFiles.disk();
        private final String operation;
        private final int at;
        private final List<String> calls = new ArrayList<>();

        Failing(String operation, int at) {
            this.operation = operation;
            this.at = at;
        }

        private void maybe(String op) throws IOException {
            calls.add(op);
            if (op.equals(operation) && calls.stream().filter(op::equals).count() == at) {
                throw new IOException("disk full");
            }
        }

        @Override
        public Kind inspect(Path path) throws IOException {
            maybe("inspect");
            return real.inspect(path);
        }

        @Override
        public Optional<Path> createFolder(Path folder) throws IOException {
            maybe("createFolder");
            return real.createFolder(folder);
        }

        @Override
        public void write(Path file, byte[] bytes) throws IOException {
            maybe("write");
            real.write(file, bytes);
        }

        @Override
        public void move(Path staging, Path output) throws IOException {
            maybe("move");
            real.move(staging, output);
        }

        @Override
        public void deleteTree(Path path) throws IOException {
            if (!"deleteTree".equals(operation)) {
                real.deleteTree(path);
                return;
            }
            maybe("deleteTree");
            real.deleteTree(path);
        }
    }

    private static Map<String, byte[]> files() {
        val files = new LinkedHashMap<String, byte[]>();
        files.put(".archicode.yaml", "a".getBytes(StandardCharsets.UTF_8));
        files.put("manifests/b.yaml", "b".getBytes(StandardCharsets.UTF_8));
        files.put("manifests/c.yaml", "c".getBytes(StandardCharsets.UTF_8));
        return files;
    }

    /** Every path under the root with the bytes of each file. */
    @SneakyThrows
    private Map<String, String> snapshot() {
        val out = new TreeMap<String, String>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (val p : (Iterable<Path>) walk::iterator) {
                out.put(
                    root.relativize(p).toString(),
                    Files.isDirectory(p) ? "<dir>" : new String(Files.readAllBytes(p), StandardCharsets.UTF_8)
                );
            }
        }
        return out;
    }

    private void assertWritten(Path output) throws IOException {
        for (val entry : files().entrySet()) {
            assertArrayEquals(entry.getValue(), Files.readAllBytes(output.resolve(entry.getKey())));
        }
        assertFalse(Files.exists(output.resolveSibling(output.getFileName() + ".archicode-import")));
    }

    @Test
    void writesIntoAnAbsentFolderAndAnAbsentParent() throws IOException {
        val output = root.resolve("a/b/out");
        ImportFiles.commit(ImportFiles.disk(), output, files());
        assertWritten(output);
    }

    @Test
    void acceptsAnEmptyExistingFolder() throws IOException {
        val output = Files.createDirectory(root.resolve("out"));
        ImportFiles.commit(ImportFiles.disk(), output, files());
        assertWritten(output);
    }

    @Test
    void refusesAFolderWithAnyEntryHiddenIncluded() throws IOException {
        val output = Files.createDirectory(root.resolve("out"));
        Files.writeString(output.resolve(".hidden"), "x");
        val before = snapshot();
        val e = assertThrows(ArchiCodeException.class, () -> ImportFiles.commit(ImportFiles.disk(), output, files()));
        assertEquals("the folder " + output + " is not empty: import writes nothing over a folder", e.getMessage());
        assertEquals(before, snapshot());
    }

    @Test
    void refusesAnOutputThatIsAFile() throws IOException {
        val output = root.resolve("out");
        Files.writeString(output, "x");
        val before = snapshot();
        val e = assertThrows(ArchiCodeException.class, () -> ImportFiles.commit(ImportFiles.disk(), output, files()));
        assertFalse(e.getMessage().contains("\n"));
        assertTrue(e.getMessage().contains("is a file"));
        assertEquals(before, snapshot());
    }

    @Test
    void replacesAStaleStagingFolder() throws IOException {
        val output = root.resolve("out");
        val stale = Files.createDirectory(root.resolve("out.archicode-import"));
        Files.writeString(stale.resolve("left-over.yaml"), "stale");
        ImportFiles.commit(ImportFiles.disk(), output, files());
        assertWritten(output);
        assertFalse(Files.exists(output.resolve("left-over.yaml")));
    }

    @Test
    void aFailureAtAnyStepLeavesTheFileSystemAsItWasForAnAbsentOutput() {
        for (val step : List.of("inspect", "createFolder", "write", "move")) {
            val max = "write".equals(step) ? 3 : 1;
            for (var n = 1; n <= max; n++) {
                val output = root.resolve("p/out");
                val before = snapshot();
                val failing = new Failing(step, n);
                val e = assertThrows(ArchiCodeException.class, () -> ImportFiles.commit(failing, output, files()));
                assertTrue(e.getMessage().contains("nothing is written"), step + n + ": " + e.getMessage());
                assertFalse(e.getMessage().contains("\n"));
                assertEquals(before, snapshot(), step + " " + n);
            }
        }
    }

    @Test
    void aFailureAtAnyStepLeavesAnEmptyFolderAsItWas() throws IOException {
        val output = Files.createDirectory(root.resolve("out"));
        for (val step : List.of("createFolder", "write", "move")) {
            val before = snapshot();
            val failing = new Failing(step, 1);
            assertThrows(ArchiCodeException.class, () -> ImportFiles.commit(failing, output, files()));
            assertEquals(before, snapshot(), step);
        }
    }

    @Test
    void theMessageNamesTheFileAndTheReason() {
        val e = assertThrows(ArchiCodeException.class, () ->
            ImportFiles.commit(new Failing("write", 2), root.resolve("out"), files())
        );
        assertEquals("the import stopped at manifests/b.yaml (disk full): nothing is written", e.getMessage());
    }
}

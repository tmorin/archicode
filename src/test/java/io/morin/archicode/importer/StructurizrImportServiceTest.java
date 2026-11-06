package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.Warnings;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** The service: what it refuses before it reads, the files it writes, and when it says what it left out. */
class StructurizrImportServiceTest {

    private static final Path SAMPLE = Path.of("src", "test", "resources", "structurizr", "big-bank-plc.json");

    @TempDir
    Path dir;

    private final Warnings warnings = new Warnings();
    private final StructurizrImportService service = new StructurizrImportService(new MapperFactory(), warnings);

    @SneakyThrows
    private Path input(String name, String content) {
        val file = dir.resolve(name);
        Files.writeString(file, content, StandardCharsets.UTF_8);
        return file;
    }

    private ArchiCodeException refused(Path input, Path output) {
        val e = assertThrows(ArchiCodeException.class, () ->
            service.importWorkspace(input, output, ImportFiles.disk())
        );
        assertFalse(e.getMessage().contains("\n"), "one line");
        assertEquals(List.of(), warnings.drain(), "a refusal says nothing of what would be dropped");
        return e;
    }

    @Test
    void aDslInputIsRefusedBeforeItIsRead() {
        val out = dir.resolve("out");
        val e = refused(dir.resolve("missing.dsl"), out);
        assertTrue(
            e.getMessage().contains("missing.dsl is not a JSON export of a Structurizr workspace"),
            e.getMessage()
        );
        assertFalse(Files.exists(out));
    }

    @Test
    void anotherExtensionIsRefused() {
        refused(input("workspace.txt", "{}"), dir.resolve("out"));
    }

    @Test
    void aMissingFileIsOneError() {
        val e = refused(dir.resolve("absent.json"), dir.resolve("out"));
        assertTrue(e.getMessage().startsWith("cannot read "), e.getMessage());
    }

    @Test
    void aFolderIsRefused() throws IOException {
        val folder = Files.createDirectory(dir.resolve("folder.json"));
        val e = refused(folder, dir.resolve("out"));
        assertTrue(e.getMessage().contains("is a folder"), e.getMessage());
    }

    @Test
    void aFileThatIsNotJsonIsOneError() {
        val e = refused(input("w.json", "this is { not json"), dir.resolve("out"));
        assertTrue(e.getMessage().contains("is not JSON"), e.getMessage());
    }

    @Test
    void aJsonWithoutAModelIsOneError() {
        val out = dir.resolve("out");
        val e = refused(input("w.json", "{\"name\": \"x\"}"), out);
        assertTrue(e.getMessage().contains("it has no `model`"), e.getMessage());
        assertFalse(Files.exists(out));
    }

    @Test
    @SneakyThrows
    void aNonEmptyFolderIsRefusedAndUnchanged() {
        val out = Files.createDirectory(dir.resolve("out"));
        Files.writeString(out.resolve(".hidden"), "keep");
        refused(SAMPLE, out);
        try (Stream<Path> entries = Files.list(out)) {
            assertEquals(List.of(".hidden"), entries.map(p -> p.getFileName().toString()).toList());
        }
        assertEquals("keep", Files.readString(out.resolve(".hidden")));
        assertFalse(Files.exists(dir.resolve("out" + ImportFiles.STAGING_SUFFIX)));
    }

    @Test
    @SneakyThrows
    void theSampleIsWrittenAndTheDropsAreSaidInOrder() {
        val out = dir.resolve("parent").resolve("out");
        val imported = service.importWorkspace(SAMPLE, out, ImportFiles.disk());
        assertEquals(18, imported.elements());
        assertTrue(Files.isRegularFile(out.resolve(".archicode.yaml")));
        try (Stream<Path> manifests = Files.list(out.resolve("manifests"))) {
            assertEquals(imported.elements(), manifests.count());
        }
        val lines = warnings.drain();
        val views = lines
            .stream()
            .filter(l -> l.startsWith("warning: views: "))
            .findFirst();
        val deployment = lines
            .stream()
            .filter(l -> l.startsWith("warning: deployment nodes: "))
            .findFirst();
        assertTrue(views.isPresent() && deployment.isPresent(), lines.toString());
        assertTrue(lines.indexOf(views.get()) < lines.indexOf(deployment.get()), lines.toString());
        val rewrite = lines
            .stream()
            .filter(l -> !l.contains(": ") || l.contains("Structurizr"))
            .findFirst();
        rewrite.ifPresent(r -> assertTrue(lines.indexOf(r) > lines.indexOf(deployment.get()), "rewrites come last"));
    }

    /** A writer that fails when the staging folder is moved into place. */
    private static final class FailingMove implements ImportFiles {

        private final ImportFiles real = ImportFiles.disk();

        @Override
        public Kind inspect(Path path) throws IOException {
            return real.inspect(path);
        }

        @Override
        public Optional<Path> createFolder(Path folder) throws IOException {
            return real.createFolder(folder);
        }

        @Override
        public void write(Path file, byte[] bytes) throws IOException {
            real.write(file, bytes);
        }

        @Override
        public void move(Path staging, Path output) throws IOException {
            throw new IOException("disk full");
        }

        @Override
        public void deleteTree(Path path) throws IOException {
            real.deleteTree(path);
        }
    }

    @Test
    void aFailedWritePrintsNoDropList() {
        val out = dir.resolve("out");
        val e = assertThrows(ArchiCodeException.class, () -> service.importWorkspace(SAMPLE, out, new FailingMove()));
        assertTrue(e.getMessage().contains("nothing is written"), e.getMessage());
        assertEquals(List.of(), warnings.drain());
        assertFalse(Files.exists(out));
        assertFalse(Files.exists(dir.resolve("out" + ImportFiles.STAGING_SUFFIX)));
    }
}

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
class LikeC4ImportServiceTest {

    private static final Path SAMPLE = Path.of("src", "test", "resources", "likec4", "cloud-system.json");

    private static final List<String> GOLDEN = List.of(
        "app=component",
        "gqlMutation=component",
        "gqlQuery=component",
        "lambda=component",
        "mobileApp=component",
        "queue=component",
        "table=component",
        "externalSystem=system"
    );

    @TempDir
    Path dir;

    private final Warnings warnings = new Warnings();
    private final LikeC4ImportService service = new LikeC4ImportService(new MapperFactory(), warnings);

    @SneakyThrows
    private Path input(String name, String content) {
        val file = dir.resolve(name);
        Files.writeString(file, content, StandardCharsets.UTF_8);
        return file;
    }

    private ArchiCodeException refused(Path input, Path output, List<String> maps, String project) {
        val e = assertThrows(ArchiCodeException.class, () ->
            service.importModel(input, output, maps, project, ImportFiles.disk())
        );
        assertFalse(e.getMessage().contains("\n"), "one line");
        assertEquals(List.of(), warnings.drain(), "a refusal says nothing of what would be dropped");
        assertFalse(Files.exists(output), "nothing is written");
        assertFalse(Files.exists(dir.resolve("out" + ImportFiles.STAGING_SUFFIX)));
        return e;
    }

    private ArchiCodeException refused(Path input) {
        return refused(input, dir.resolve("out"), List.of(), null);
    }

    @Test
    void aC4SourceIsRefusedBeforeItIsRead() {
        val e = refused(dir.resolve("model.c4"));
        assertTrue(
            e.getMessage().contains("model.c4 is a LikeC4 source file: export it to JSON first"),
            e.getMessage()
        );
        assertTrue(e.getMessage().contains("likec4 export json --skip-layout"), e.getMessage());
    }

    @Test
    void aLikec4SourceIsRefusedWithTheSameSentence() {
        val e = refused(dir.resolve("MODEL.LIKEC4"));
        assertTrue(e.getMessage().contains("is a LikeC4 source file: export it to JSON first"), e.getMessage());
    }

    @Test
    void anotherExtensionIsRefused() {
        val e = refused(input("model.txt", "{}"));
        assertTrue(e.getMessage().contains("model.txt is not a JSON export of a LikeC4 model"), e.getMessage());
    }

    @Test
    void aMissingFileIsOneError() {
        val e = refused(dir.resolve("absent.json"));
        assertTrue(e.getMessage().startsWith("cannot read "), e.getMessage());
    }

    @Test
    void aFolderIsRefused() throws IOException {
        val e = refused(Files.createDirectory(dir.resolve("folder.json")));
        assertTrue(e.getMessage().contains("is a folder"), e.getMessage());
    }

    @Test
    void aFileThatIsNotJsonIsOneError() {
        val e = refused(input("m.json", "this is { not json"));
        assertTrue(e.getMessage().contains("is not JSON"), e.getMessage());
    }

    @Test
    void aJsonWithoutElementsIsOneError() {
        val e = refused(input("m.json", "{\"projectId\": \"x\"}"));
        assertTrue(e.getMessage().contains("it has no elements"), e.getMessage());
    }

    @Test
    void aKindWithoutATargetIsOneErrorThatListsThem() {
        val e = refused(SAMPLE);
        assertTrue(
            e.getMessage().contains("no ArchiCode kind for the LikeC4 kind(s) app, externalSystem"),
            e.getMessage()
        );
    }

    @Test
    void aMapOfAnAbsentKindIsOneError() {
        val e = refused(SAMPLE, dir.resolve("out"), List.of("nothing=component"), null);
        assertTrue(e.getMessage().contains("--map names the kind nothing"), e.getMessage());
    }

    @Test
    void aMalformedMapIsOneError() {
        refused(SAMPLE, dir.resolve("out"), List.of("app"), null);
    }

    @Test
    void aProjectTheFileDoesNotHoldIsOneError() {
        val e = refused(SAMPLE, dir.resolve("out"), GOLDEN, "other");
        assertTrue(e.getMessage().contains("holds no project other"), e.getMessage());
    }

    @Test
    @SneakyThrows
    void aNonEmptyFolderIsRefusedAndUnchanged() {
        val out = Files.createDirectory(dir.resolve("out"));
        Files.writeString(out.resolve(".hidden"), "keep");
        val e = assertThrows(ArchiCodeException.class, () ->
            service.importModel(SAMPLE, out, GOLDEN, null, ImportFiles.disk())
        );
        assertTrue(e.getMessage().contains("is not empty"), e.getMessage());
        try (Stream<Path> entries = Files.list(out)) {
            assertEquals(List.of(".hidden"), entries.map(p -> p.getFileName().toString()).toList());
        }
        assertEquals("keep", Files.readString(out.resolve(".hidden")));
        assertEquals(List.of(), warnings.drain());
        assertFalse(Files.exists(dir.resolve("out" + ImportFiles.STAGING_SUFFIX)));
    }

    @Test
    @SneakyThrows
    void theSampleIsWrittenAndTheDropsAreSaidInOrder() {
        val out = dir.resolve("parent").resolve("out");
        val imported = service.importModel(SAMPLE, out, GOLDEN, null, ImportFiles.disk());
        assertEquals(21, imported.elements());
        assertTrue(Files.isRegularFile(out.resolve(".archicode.yaml")));
        try (Stream<Path> manifests = Files.list(out.resolve("manifests"))) {
            assertEquals(imported.elements(), manifests.count());
        }
        val lines = warnings.drain();
        val views = lines.indexOf("warning: views: 3 dropped");
        val count = lines.indexOf("warning: dropped elements: 6");
        assertTrue(views >= 0 && count > views, lines.toString());
        val each = lines
            .stream()
            .filter(l -> l.startsWith("warning: element ") && l.contains(" dropped: "))
            .toList();
        assertEquals(6, each.size(), lines.toString());
        assertTrue(lines.indexOf(each.get(0)) > count, "one line per dropped element follows the count");
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
        val e = assertThrows(ArchiCodeException.class, () ->
            service.importModel(SAMPLE, out, GOLDEN, null, new FailingMove())
        );
        assertTrue(e.getMessage().contains("nothing is written"), e.getMessage());
        assertEquals(List.of(), warnings.drain());
        assertFalse(Files.exists(out));
        assertFalse(Files.exists(dir.resolve("out" + ImportFiles.STAGING_SUFFIX)));
    }
}

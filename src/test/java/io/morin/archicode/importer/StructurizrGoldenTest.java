package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.Warnings;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The import of the sample, byte for byte against {@code src/test/resources/structurizr/expected/}, and its warnings
 * against {@code expected-report.txt}. To regenerate both after a change of the importer that is meant, run
 * {@code ./mvnw test -Dtest=StructurizrGoldenTest -Darchicode.golden.regenerate=true}, read the diff, and commit it.
 */
class StructurizrGoldenTest {

    private static final Path ROOT = Path.of("src", "test", "resources", "structurizr");
    private static final Path SAMPLE = ROOT.resolve("big-bank-plc.json");
    private static final Path EXPECTED = ROOT.resolve("expected");
    private static final Path REPORT = ROOT.resolve("expected-report.txt");

    @TempDir
    Path dir;

    private final Warnings warnings = new Warnings();
    private final StructurizrImportService service = new StructurizrImportService(new MapperFactory(), warnings);

    @SneakyThrows
    private static List<String> relative(Path root) {
        try (Stream<Path> files = Files.walk(root)) {
            return files
                .filter(Files::isRegularFile)
                .map(f -> root.relativize(f).toString().replace('\\', '/'))
                .sorted()
                .toList();
        }
    }

    @SneakyThrows
    private static void deleteTree(Path root) {
        if (Files.exists(root)) {
            try (Stream<Path> files = Files.walk(root)) {
                for (val f : files.sorted(java.util.Comparator.reverseOrder()).toList()) {
                    Files.delete(f);
                }
            }
        }
    }

    @Test
    @SneakyThrows
    void theImportOfTheSampleIsTheGolden() {
        val out = dir.resolve("out");
        val imported = service.importWorkspace(SAMPLE, out, ImportFiles.disk());
        val report = String.join("\n", warnings.drain()) + "\n";

        if (Boolean.getBoolean("archicode.golden.regenerate")) {
            deleteTree(EXPECTED);
            for (val name : relative(out)) {
                val target = EXPECTED.resolve(name);
                Files.createDirectories(target.getParent());
                Files.write(target, Files.readAllBytes(out.resolve(name)));
            }
            Files.writeString(REPORT, report, StandardCharsets.UTF_8);
        }

        assertEquals(relative(EXPECTED), relative(out), "the files of the golden");
        for (val name : relative(out)) {
            assertArrayEquals(
                Files.readAllBytes(EXPECTED.resolve(name)),
                Files.readAllBytes(out.resolve(name)),
                "the bytes of " + name
            );
        }
        assertEquals(Files.readString(REPORT, StandardCharsets.UTF_8), report, "the warnings");
        assertTrue(report.contains("warning: views: "), report);
        assertTrue(report.contains("warning: deployment nodes: "), report);

        val model = new ObjectMapper().readTree(SAMPLE.toFile()).path("model");
        val inSample =
            model.path("people").size() +
            model.path("softwareSystems").size() +
            StreamCount.of(model.path("softwareSystems"), "containers") +
            StreamCount.ofNested(model.path("softwareSystems"));
        assertEquals(inSample, imported.elements(), "the elements of the sample");
        assertEquals(imported.elements(), relative(EXPECTED.resolve("manifests")).size(), "one manifest per element");
    }

    /** Counts what the sample holds below the systems. */
    private static final class StreamCount {

        static int of(com.fasterxml.jackson.databind.JsonNode systems, String field) {
            var n = 0;
            for (val s : systems) {
                n += s.path(field).size();
            }
            return n;
        }

        static int ofNested(com.fasterxml.jackson.databind.JsonNode systems) {
            var n = 0;
            for (val s : systems) {
                for (val c : s.path("containers")) {
                    n += c.path("components").size();
                }
            }
            return n;
        }
    }
}

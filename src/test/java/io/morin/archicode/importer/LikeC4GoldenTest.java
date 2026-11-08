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
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The import of the LikeC4 sample, byte for byte against {@code src/test/resources/likec4-expected/}, and its warnings
 * against {@code likec4-expected-report.txt}. To regenerate both after a change of the importer that is meant, run
 * {@code ./mvnw test -Dtest=LikeC4GoldenTest -Darchicode.golden.regenerate=true}, read the diff, and commit it.
 */
class LikeC4GoldenTest {

    private static final Path RESOURCES = Path.of("src", "test", "resources");
    private static final Path SAMPLE = RESOURCES.resolve("likec4").resolve("cloud-system.json");
    private static final Path EXPECTED = RESOURCES.resolve("likec4-expected");
    private static final Path REPORT = RESOURCES.resolve("likec4-expected-report.txt");
    private static final List<String> MAPS = List.of(
        "app=component",
        "externalSystem=system",
        "gqlMutation=component",
        "gqlQuery=component",
        "lambda=component",
        "mobileApp=component",
        "queue=component",
        "table=component"
    );

    @TempDir
    Path dir;

    private final Warnings warnings = new Warnings();
    private final LikeC4ImportService service = new LikeC4ImportService(new MapperFactory(), warnings);

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
                for (val f : files.sorted(Comparator.reverseOrder()).toList()) {
                    Files.delete(f);
                }
            }
        }
    }

    @Test
    @SneakyThrows
    void theImportOfTheSampleIsTheGolden() {
        val out = dir.resolve("out");
        val imported = service.importModel(SAMPLE, out, MAPS, null, ImportFiles.disk());
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

        val inSample = new ObjectMapper().readTree(SAMPLE.toFile()).path("elements").size();
        assertEquals(27, inSample, "the elements of the sample");
        assertEquals(21, imported.elements(), "the elements written");
        assertTrue(report.contains("warning: dropped elements: 6"), report);
        assertEquals(inSample - 6, imported.elements(), "the sample minus the dropped elements");
        assertEquals(imported.elements(), relative(EXPECTED.resolve("manifests")).size(), "one manifest per element");
    }
}

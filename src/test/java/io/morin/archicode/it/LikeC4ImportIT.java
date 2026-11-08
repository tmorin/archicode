package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.main.LaunchResult;
import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@code archicode import likec4} by the packaged application: the sample is imported with one {@code --map} for each of its
 * eight kinds that have no default, the same process loads the output ({@code query graph}) and the number of elements is the
 * sample's minus the elements the report says were dropped; a {@code .c4} file, a folder that is not empty, the sample with no
 * {@code --map} and an array of two projects are each one {@code error:} line, and the folder is left as it was.
 */
@QuarkusMainIntegrationTest
class LikeC4ImportIT {

    private static final Path SAMPLE = Path.of("src/test/resources/likec4/cloud-system.json");
    private static final Pattern DROPPED_COUNT = Pattern.compile(
        "^warning: dropped elements: (\\d+)$",
        Pattern.MULTILINE
    );
    private static final List<String> KINDS = List.of(
        "app",
        "externalSystem",
        "table",
        "gqlQuery",
        "gqlMutation",
        "mobileApp",
        "queue",
        "lambda"
    );

    @TempDir
    Path dir;

    @SneakyThrows
    private static String snapshot(Path root) {
        try (Stream<Path> files = Files.walk(root)) {
            return files
                .sorted()
                .map(f -> root.relativize(f) + (Files.isRegularFile(f) ? "=" + read(f) : "/"))
                .collect(Collectors.joining("\n"));
        }
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    private static void oneError(LaunchResult result) {
        assertEquals(1, result.exitCode(), () -> said(result));
        val error = result.getErrorOutput().strip();
        assertTrue(error.startsWith("error: "), () -> said(result));
        assertEquals(1, error.lines().count(), () -> said(result));
        assertFalse(error.contains("\tat "), () -> said(result));
    }

    /** The target of the eight kinds, the mapping of the golden. */
    private static String target(String kind) {
        return "externalSystem".equals(kind) ? "system" : "component";
    }

    private static List<String> launchArguments(Path input, Path folder, boolean mapped) {
        val arguments = new ArrayList<>(List.of("import", "likec4", input.toString(), "-o", folder.toString()));
        if (mapped) {
            for (val kind : KINDS) {
                arguments.add("--map");
                arguments.add(kind + "=" + target(kind));
            }
        }
        return arguments;
    }

    @SneakyThrows
    private static int sampleElements() {
        return new ObjectMapper().readTree(SAMPLE.toFile()).get("elements").size();
    }

    @Test
    void theSampleIsImportedAndTheOutputIsLoaded(QuarkusMainLauncher launcher) {
        val folder = dir.resolve("cloud");
        val imported = launcher.launch(launchArguments(SAMPLE, folder, true).toArray(String[]::new));
        succeeded(imported);
        notEmpty(folder.resolve(".archicode.yaml"));

        val warnings = imported.getErrorOutput();
        val dropped = warnings
            .lines()
            .filter(line -> line.startsWith("warning: element ") && line.contains(" dropped: "))
            .count();
        val said = DROPPED_COUNT.matcher(warnings);
        assertTrue(said.find(), () -> said(imported));
        assertEquals(Integer.parseInt(said.group(1)), dropped, () -> said(imported));

        val graph = succeeded(launcher.launch("-w", workspace(folder), "query", "graph"));
        val references = payload(graph).split("\"reference\":", -1).length - 1;
        assertEquals(sampleElements() - dropped, references, () -> said(graph));
    }

    @Test
    void aC4FileIsOneErrorLineAndWritesNothing(QuarkusMainLauncher launcher) throws Exception {
        val source = dir.resolve("model.c4");
        Files.writeString(source, "model {}\n");
        val folder = dir.resolve("never");
        oneError(launcher.launch(launchArguments(source, folder, true).toArray(String[]::new)));
        assertTrue(Files.notExists(folder), "nothing is written");
    }

    @Test
    void aFolderThatIsNotEmptyIsOneErrorLineAndIsUnchanged(QuarkusMainLauncher launcher) throws Exception {
        val folder = dir.resolve("busy");
        Files.createDirectories(folder);
        Files.writeString(folder.resolve("keep.txt"), "mine");
        val before = snapshot(folder);
        oneError(launcher.launch(launchArguments(SAMPLE, folder, true).toArray(String[]::new)));
        assertEquals(before, snapshot(folder));
    }

    @Test
    void theSampleWithNoMapNamesTheEightKindsThenTheMapsSucceed(QuarkusMainLauncher launcher) {
        val folder = dir.resolve("unmapped");
        val refused = launcher.launch(launchArguments(SAMPLE, folder, false).toArray(String[]::new));
        oneError(refused);
        val error = refused.getErrorOutput();
        var from = 0;
        for (val kind : KINDS) {
            val at = error.indexOf(kind, from);
            assertTrue(at >= from, () -> "the kind " + kind + " is named in order: " + error);
            from = at + kind.length();
        }
        assertTrue(Files.notExists(folder), "nothing is written");

        succeeded(launcher.launch(launchArguments(SAMPLE, folder, true).toArray(String[]::new)));
        notEmpty(folder.resolve(".archicode.yaml"));
    }

    @Test
    void anArrayOfTwoProjectsIsOneErrorLineAndWritesNothing(QuarkusMainLauncher launcher) throws Exception {
        val source = dir.resolve("projects.json");
        Files.writeString(
            source,
            "[{\"projectId\":\"a\",\"elements\":{},\"relations\":{}},{\"projectId\":\"b\",\"elements\":{},\"relations\":{}}]"
        );
        val folder = dir.resolve("never");
        oneError(launcher.launch("import", "likec4", source.toString(), "-o", folder.toString()));
        assertTrue(Files.notExists(folder), "nothing is written");
    }
}

package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.LaunchResult;
import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@code archicode import structurizr} by the packaged application: the jar under the JVM and the native runner under
 * {@code -Dnative} import the sample, which the same process then loads ({@code query graph}); a file that is not a JSON export and a
 * folder that is not empty are each one {@code error:} line, and the folder is left as it was.
 */
@QuarkusMainIntegrationTest
class StructurizrImportIT {

    private static final Path SAMPLE = Path.of("src/test/resources/structurizr/big-bank-plc.json");
    private static final int ELEMENTS = 18;

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
    }

    @Test
    void theSampleIsImportedAndTheOutputIsLoaded(QuarkusMainLauncher launcher) {
        val folder = dir.resolve("bank");
        val imported = succeeded(launcher.launch("import", "structurizr", SAMPLE.toString(), "-o", folder.toString()));
        assertTrue(payload(imported).contains("imported " + ELEMENTS + " elements"), () -> said(imported));
        notEmpty(folder.resolve(".archicode.yaml"));

        val graph = succeeded(launcher.launch("-w", workspace(folder), "query", "graph"));
        val references = payload(graph).split("\"reference\":", -1).length - 1;
        assertEquals(ELEMENTS, references, () -> said(graph));
    }

    @Test
    void aDslFileIsOneErrorLineAndWritesNothing(QuarkusMainLauncher launcher) throws Exception {
        val dsl = dir.resolve("workspace.dsl");
        Files.writeString(dsl, "workspace {}\n");
        val folder = dir.resolve("never");
        oneError(launcher.launch("import", "structurizr", dsl.toString(), "-o", folder.toString()));
        assertTrue(Files.notExists(folder), "nothing is written");
    }

    @Test
    void aFolderThatIsNotEmptyIsOneErrorLineAndIsUnchanged(QuarkusMainLauncher launcher) throws Exception {
        val folder = dir.resolve("busy");
        Files.createDirectories(folder);
        Files.writeString(folder.resolve("keep.txt"), "mine");
        val before = snapshot(folder);
        oneError(launcher.launch("import", "structurizr", SAMPLE.toString(), "-o", folder.toString()));
        assertEquals(before, snapshot(folder));
    }
}

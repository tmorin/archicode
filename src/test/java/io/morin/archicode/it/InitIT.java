package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
 * {@code archicode init} by the packaged application (wave 022, run 0160, V5): the jar under the JVM and the native runner under
 * {@code -Dnative} write the workspace from the resources of the application, which the same process then loads
 * ({@code query graph}) and draws ({@code views generate}); a second {@code init} in the same folder is refused and changes nothing.
 */
@QuarkusMainIntegrationTest
class InitIT {

    @TempDir
    Path dir;

    @SneakyThrows
    private static String snapshot(Path root) {
        try (Stream<Path> files = Files.walk(root)) {
            return files
                .filter(Files::isRegularFile)
                .sorted()
                .map(f -> root.relativize(f) + "=" + read(f))
                .collect(Collectors.joining("\n"));
        }
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    @Test
    void theWorkspaceItWritesIsLoadedAndDrawnAndASecondInitRefusesAndChangesNothing(QuarkusMainLauncher launcher) {
        val folder = dir.resolve("fresh");
        val init = succeeded(launcher.launch("init", folder.toString()));
        assertTrue(payload(init).contains("archicode views generate"), () -> said(init));
        notEmpty(folder.resolve(".archicode.yaml"));
        notEmpty(folder.resolve("manifests/shop.yaml"));
        assertEquals("/views*/\n", read(folder.resolve(".gitignore")));

        val graph = succeeded(launcher.launch("-w", workspace(folder), "query", "graph"));
        assertTrue(payload(graph).contains("shop.web"), () -> said(graph));
        succeeded(launcher.launch("-w", workspace(folder), "views", "generate"));
        notEmpty(folder.resolve("views/plantuml/application/shop-overview.puml"));
        val saved = succeeded(launcher.launch("-w", workspace(folder), "views", "generate", "-i", "shop_overview"));
        assertEquals("", saved.getErrorOutput().strip(), () -> said(saved));
        notEmpty(folder.resolve("views/plantuml/application/shop_overview.puml"));

        val before = snapshot(folder);
        val again = launcher.launch("init", folder.toString());
        assertEquals(1, again.exitCode(), () -> said(again));
        val error = again.getErrorOutput().strip();
        assertTrue(error.startsWith("error: "), () -> said(again));
        assertEquals(1, error.lines().count(), () -> said(again));
        assertEquals(before, snapshot(folder));
    }
}

package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * {@code archicode guide} by the packaged application (wave 022, run 0159, V5): the jar under the JVM and the native runner under
 * {@code -Dnative} print the same guide, byte for byte, as the golden file of {@code src/test/resources/guide} (its first line,
 * {@code archicode guide @VERSION@}, is the version of the pom, which the build hands to the tests). The text is a resource of the
 * application, and the kinds and the commands in it are generated from the classes and the Picocli spec by reflection: the native
 * image only has what is registered, and this is the check that it does.
 */
@QuarkusMainIntegrationTest
class GuideIT {

    private static final Path GOLDEN = Path.of("src/test/resources/guide/golden.md");

    @SneakyThrows
    private static String golden() {
        val version = System.getProperty("archicode.version");
        assertNotNull(version, "the build gives the version of the pom as the property archicode.version");
        return Files.readString(GOLDEN).replace("@VERSION@", version);
    }

    @Test
    void theGuideIsTheGoldenFile(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("guide"));
        assertEquals(golden().strip(), payload(result).strip(), () -> said(result));
        assertEquals("", result.getErrorOutput().strip(), () -> said(result));
    }

    @Test
    void itLoadsNoWorkspaceAndIsTheSameOnEveryRun(QuarkusMainLauncher launcher) {
        val first = payload(succeeded(launcher.launch("guide")));
        assertEquals(first, payload(succeeded(launcher.launch("guide"))));
        val elsewhere = succeeded(launcher.launch("-w", "/nowhere/.archicode.yaml", "guide"));
        assertEquals(first, payload(elsewhere), () -> said(elsewhere));
    }

    @Test
    void itIsUnderItsBudgetAndStartsWithTheVersion(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("guide"));
        val text = payload(result);
        assertTrue(text.getBytes(StandardCharsets.UTF_8).length <= 30 * 1024, () -> "the guide is too long");
        assertEquals("archicode guide " + System.getProperty("archicode.version"), text.lines().findFirst().orElse(""));
    }

    @Test
    void theTopCommandListsIt(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("--help"));
        assertTrue(result.getOutput().contains("guide"), () -> said(result));
    }
}

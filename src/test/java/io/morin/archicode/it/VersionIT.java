package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * {@code archicode --version} by the packaged application (wave 021, run 0155, issue #149): the jar under the JVM and the
 * native runner under {@code -Dnative} tell the version of the build they were made from, in one line, on the standard output,
 * with exit code 0 and without a workspace. It is what the release job of the pipeline starts a binary with, as published.
 */
@QuarkusMainIntegrationTest
class VersionIT {

    private static String expected() {
        val version = System.getProperty("archicode.version");
        assertNotNull(version, "the build gives the version of the pom as the property archicode.version");
        return "archicode " + version;
    }

    @Test
    void versionIsTheOneOfTheBuild(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("--version"));
        assertEquals(expected(), payload(result), () -> said(result));
        assertEquals("", result.getErrorOutput().strip(), () -> said(result));
    }

    @Test
    void theShortOptionIsTheSame(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("-V"));
        assertEquals(expected(), payload(result), () -> said(result));
    }

    @Test
    void helpListsTheOption(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("--help"));
        assertTrue(result.getOutput().contains("-V, --version"), () -> said(result));
    }
}

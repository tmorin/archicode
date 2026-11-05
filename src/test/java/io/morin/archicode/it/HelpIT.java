package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The name the packaged application gives itself in a usage (wave 032, run 0222, issue #201): the jar under the JVM and the
 * native runner under {@code -Dnative} start every usage with {@code Usage: archicode}, never with the name of the main
 * class. It holds for {@code --help} of the top command, for {@code --help} of a command of the second level, and for the
 * usage that follows the message of a usage error.
 */
@QuarkusMainIntegrationTest
class HelpIT {

    private static String firstLine(String text) {
        return text.lines().findFirst().orElse("");
    }

    @Test
    void helpOfTheTopCommandStartsWithItsName(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("--help"));
        assertTrue(firstLine(payload(result)).startsWith("Usage: archicode "), () -> said(result));
    }

    @Test
    void helpOfASubcommandStartsWithItsPath(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("query", "graph", "--help"));
        assertTrue(firstLine(payload(result)).startsWith("Usage: archicode query graph"), () -> said(result));
    }

    @Test
    void usageAfterAnErrorStartsWithItsPath(QuarkusMainLauncher launcher) {
        val result = launcher.launch("views", "generate", "--bogus");
        assertEquals(2, result.exitCode(), () -> said(result));
        assertEquals("", payload(result), () -> said(result));
        val lines = result.getErrorOutput().lines().toList();
        assertEquals("Unknown option: '--bogus'", lines.get(0), () -> said(result));
        assertTrue(lines.get(1).startsWith("Usage: archicode views generate"), () -> said(result));
    }
}

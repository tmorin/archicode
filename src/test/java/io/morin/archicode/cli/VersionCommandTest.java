package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import lombok.val;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

/**
 * {@code archicode --version} (wave 021, run 0155, issue #149): one line, {@code archicode <version>}, on the standard output,
 * exit 0, with no workspace loaded. The version is the one of the {@code pom.xml} that built the application (the
 * {@code archicode.version} property of the Surefire configuration).
 */
@QuarkusTest
class VersionCommandTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    private static String expected() {
        val version = System.getProperty("archicode.version");
        assertNotNull(version, "the build gives the version of the pom as the property archicode.version");
        return "archicode " + version + System.lineSeparator();
    }

    @Test
    void theLongOptionPrintsTheVersionOfTheBuildAndNothingElse() {
        val result = CliHarness.run(factory, errorOutput, "--version");
        assertEquals(0, result.exit(), result.err());
        assertEquals(expected(), result.out());
        assertEquals("", result.err());
    }

    @Test
    void theShortOptionIsTheSame() {
        val result = CliHarness.run(factory, errorOutput, "-V");
        assertEquals(0, result.exit(), result.err());
        assertEquals(expected(), result.out());
    }

    @Test
    void noWorkspaceIsLoaded() {
        val result = CliHarness.run(factory, errorOutput, "-w", "target/no/such/.archicode.yaml", "--version");
        assertEquals(0, result.exit(), result.err());
        assertEquals(expected(), result.out());
        assertEquals("", result.err());
    }

    @Test
    void theVersionLooksLikeAVersion() {
        val result = CliHarness.run(factory, errorOutput, "--version");
        assertTrue(result.out().matches("archicode \\d+\\.\\d+\\.\\d+(-SNAPSHOT)?\\R"), result.out());
    }

    @Test
    void onlyTheTopCommandHasTheOption() {
        val top = CliHarness.run(factory, errorOutput, "--help");
        assertTrue(top.out().contains("-V, --version"), top.out());
        for (val command : new String[][] {
            { "views", "--help" },
            { "views", "generate", "--help" },
            { "query", "--help" },
            { "editor", "--help" },
            { "editor", "serve", "--help" },
            { "plateau", "--help" },
            { "stories", "--help" },
            { "stories", "generate", "--help" },
            { "diff", "--help" }
        }) {
            val result = CliHarness.run(factory, errorOutput, command);
            assertEquals(0, result.exit(), String.join(" ", command));
            assertFalse(result.out().contains("--version"), String.join(" ", command) + "\n" + result.out());
        }
        val sub = CliHarness.run(factory, errorOutput, "diff", "--version");
        assertEquals(2, sub.exit(), "a subcommand has no --version: usage error");
    }
}

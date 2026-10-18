package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The folders that {@code views generate --output out} writes next to {@code workspace.yaml} ({@code out-saas},
 * {@code out-saas-vs-baseline}) hold {@code gap.json}, and the layered Brightcart reads {@code ./**} for its manifests: the next
 * run must not read them as manifests (issue #88).
 */
@QuarkusTest
class BrightcartOutputFolderTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @Test
    void shouldNotReadTheFoldersOfAnEarlierOutputAsManifests() {
        val workspace = Brightcart.copy(dir);
        val cli = new Brightcart.Cli(factory, errorOutput);
        val arguments = List.of("views", "generate", "--plateau", "saas", "--output", "out");

        val first = cli.in(workspace, arguments);
        assertEquals(0, first.exit(), first.err());
        assertTrue(Files.isDirectory(dir.resolve("out-saas-vs-baseline")), "the comparison was written");
        assertTrue(Files.exists(dir.resolve("out-saas-vs-baseline").resolve("gap.json")), "with its table of changes");

        val second = cli.in(workspace, arguments);
        assertEquals(0, second.exit(), "the second run reads the folders of the first as manifests: " + second.err());
        assertEquals("", second.err());
    }

    @Test
    void shouldNotReadTheFoldersOfAnAbsoluteOutputBelowTheWorkspaceEither() {
        val workspace = Brightcart.copy(dir);
        val cli = new Brightcart.Cli(factory, errorOutput);
        val arguments = List.of("views", "generate", "--plateau", "saas", "--output", dir.resolve("abs").toString());

        val first = cli.in(workspace, arguments);
        assertEquals(0, first.exit(), first.err());
        assertTrue(Files.exists(dir.resolve("abs-saas-vs-baseline").resolve("gap.json")));

        val second = cli.in(workspace, arguments);
        assertEquals(0, second.exit(), "the second run reads the folders of the first as manifests: " + second.err());
        assertEquals("", second.err());
    }

    @Test
    void shouldStillNotReadTheFoldersOfTheSettingsWhenAnotherOneIsAsked() {
        val workspace = Brightcart.copy(dir);
        val cli = new Brightcart.Cli(factory, errorOutput);

        val first = cli.in(workspace, List.of("views", "generate", "--plateau", "saas"));
        assertEquals(0, first.exit(), first.err());
        assertTrue(Files.exists(dir.resolve("views-saas-vs-baseline").resolve("gap.json")));

        val second = cli.in(workspace, List.of("views", "generate", "--plateau", "saas", "--output", "out"));
        assertEquals(0, second.exit(), second.err());
        assertEquals("", second.err());
    }

    /**
     * Issue #88, the half run 0085 left: the other commands know no {@code --output}, so they find the folder of a comparison by
     * what it holds (a {@code gap.json} and a {@code gap.md}), whatever the run that wrote it named it.
     */
    @Test
    void shouldLetTheOtherCommandsLeaveOutTheFolderOfAComparisonWhateverOutputNamedIt() {
        val workspace = Brightcart.copy(dir);
        val cli = new Brightcart.Cli(factory, errorOutput);
        val first = cli.in(workspace, List.of("views", "generate", "--plateau", "saas", "--output", "out"));
        assertEquals(0, first.exit(), first.err());
        assertTrue(Files.exists(dir.resolve("out-saas-vs-baseline").resolve("gap.json")));
        assertTrue(Files.exists(dir.resolve("out-saas-vs-baseline").resolve("gap.md")));

        for (val arguments : List.of(
            List.of("diff", "--plateau", "saas"),
            List.of("query", "graph", "--plateau", "saas"),
            List.of("plateau", "list"),
            List.of("query", "views", "--plateau", "saas")
        )) {
            val result = cli.in(workspace, arguments);
            assertEquals(0, result.exit(), arguments + ": " + result.err());
            assertEquals("", result.err(), arguments.toString());
        }
    }

    @Test
    @SneakyThrows
    void shouldStillReadTheFolderThatHoldsOnlyOneOfTheTwoFiles() {
        // a gap.json alone may be an author's manifest: leaving its folder out in silence would hide manifests, so it is refused
        val workspace = Brightcart.copy(dir);
        Files.createDirectories(dir.resolve("notes"));
        Files.writeString(dir.resolve("notes/gap.json"), "{\"gap\": true}\n");
        val result = new Brightcart.Cli(factory, errorOutput).in(workspace, List.of("plateau", "list"));
        assertEquals(1, result.exit(), result.out());
        assertTrue(result.err().startsWith("error: "), result.err());
        assertTrue(result.err().contains("notes/gap.json"), result.err());
    }
}

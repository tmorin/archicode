package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
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
}

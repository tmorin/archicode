package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.morin.archicode.manifest.ManifestParser;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.mockito.InjectSpy;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import picocli.CommandLine;

/**
 * What a comparison loads, on the layered Brightcart (review of wave 014, issue #102): the manifests are parsed once for each
 * plateau a comparison loads and never again for the workspace of the comparison, {@code --plateau} gets past a
 * {@code settings.current} that names nothing any more, and the {@code replaces} that a plateau inherits are left out of a
 * comparison with the plateaus that already say them, whichever pair is compared (the graph records which plateau wrote them).
 */
@QuarkusTest
class ComparisonLoadTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @InjectSpy
    ManifestParser manifestParser;

    @TempDir
    Path dir;

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    @BeforeEach
    void forgetTheParsesOfTheOtherTests() {
        Mockito.clearInvocations(manifestParser);
    }

    @SneakyThrows
    private static JsonNode json(String text) {
        return Brightcart.MAPPER.readTree(text);
    }

    private long parses() {
        return Mockito.mockingDetails(manifestParser)
            .getInvocations()
            .stream()
            .filter(invocation -> invocation.getMethod().getName().equals("parse"))
            .count();
    }

    // ---- one load for each plateau ----

    @Test
    void aComparisonOfViewsParsesTheManifestsOnceForEachPlateauItLoads() {
        val workspace = Brightcart.copy(dir);
        // saas is compared with baseline: two plateaus, two parses, and none for the workspace that holds the union, nor for the
        // three facets of the workspace (the facets work on what was loaded)
        val result = cli().in(workspace, List.of("views", "generate", "--plateau", "saas"));
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isDirectory(dir.resolve("views-saas-vs-baseline")), "the comparison was drawn");
        assertEquals(2, parses());

        Mockito.clearInvocations(manifestParser);
        val sibling = cli().in(
            workspace,
            List.of("views", "generate", "--plateau", "marketplace", "--against", "saas")
        );
        assertEquals(0, sibling.exit(), sibling.err());
        assertTrue(Files.isDirectory(dir.resolve("views-marketplace-vs-saas")), "the comparison was drawn");
        assertEquals(
            2,
            parses(),
            "a plateau compared with a sibling, a chain of three layers: still one parse for each"
        );
    }

    @Test
    void thePlainViewsOfAPlateauAndTheTableOfChangesAreLoadedOnce() {
        val workspace = Brightcart.copy(dir);
        assertEquals(
            0,
            cli()
                .in(workspace, List.of("views", "generate", "--plateau", "baseline"))
                .exit()
        );
        assertEquals(1, parses(), "the root is compared with nothing: one plateau, one parse");

        Mockito.clearInvocations(manifestParser);
        assertEquals(
            0,
            cli()
                .in(workspace, List.of("diff", "--plateau", "inhouse"))
                .exit()
        );
        assertEquals(2, parses());

        Mockito.clearInvocations(manifestParser);
        assertEquals(0, cli().in(workspace, List.of("plateau", "list")).exit());
        assertEquals(1, parses());
    }

    // ---- --plateau before settings.current ----

    @Test
    @SneakyThrows
    void anExplicitPlateauGetsPastASettingsCurrentThatNamesAPlateauThatIsGone() {
        val workspace = Brightcart.copy(dir);
        Files.writeString(
            workspace,
            Files.readString(workspace).replace("settings:\n", "settings:\n  current: \"renamed-long-ago\"\n")
        );

        val named = cli().in(workspace, List.of("diff", "--plateau", "saas"));
        assertEquals(0, named.exit(), named.err());
        assertTrue(named.out().startsWith("comparing saas ("), named.out());

        val unnamed = cli().in(workspace, List.of("diff"));
        assertEquals(1, unnamed.exit());
        assertEquals(
            "error: `settings.current` names the plateau `renamed-long-ago`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`, `saas`)",
            unnamed.err().strip()
        );

        val unknown = cli().in(workspace, List.of("diff", "--plateau", "nope"));
        assertEquals(1, unknown.exit());
        assertTrue(
            unknown.err().startsWith("error: unknown plateau `nope`: the plateaus of this workspace are"),
            unknown.err()
        );
    }

    // ---- the replaces a plateau inherits ----

    @Test
    void theHistoryOfAnOlderLayerIsKnownToAPlateauThatHasItAndIsNewsToOneThatHasNot() {
        val workspace = Brightcart.copy(dir);
        val cli = cli();

        // marketplace builds on inhouse, so the moves inhouse wrote are not marketplace's news: no warning, no moves of its own
        val parent = cli.in(
            workspace,
            List.of("diff", "--plateau", "marketplace", "--against", "inhouse", "-f", "json")
        );
        assertEquals(0, parent.exit(), parent.err());
        assertEquals("", parent.err());
        assertEquals(5, json(parent.out()).at("/counts/elements/moved").asInt());

        // the root has not got the layer inhouse: the moves it wrote are the news, and so they were before this rule moved
        val skipping = cli.in(
            workspace,
            List.of("diff", "--plateau", "marketplace", "--against", "baseline", "-f", "json")
        );
        assertEquals(0, skipping.exit(), skipping.err());
        val counts = json(skipping.out()).at("/counts/elements");
        assertEquals(10, counts.get("moved").asInt());
        assertEquals(2, counts.get("split").asInt());
        assertEquals(1, counts.get("merged").asInt());

        // the other way round, a plateau is compared with one that builds on it: what inhouse wrote is the history of an element the
        // base holds too, and is not news, except for the element the base moved again (it has lost it, so the entry is all there is
        // of that history: the one warning that was told before this rule moved, and the candidates that go with it)
        val older = cli.in(
            workspace,
            List.of("diff", "--plateau", "inhouse", "--against", "marketplace", "-f", "json")
        );
        assertEquals(0, older.exit(), older.err());
        assertEquals(
            "warning: replaces of commerce.search (application layer): shop.app.search is not an element of the base plateau, ignored",
            older.err().strip()
        );
    }
}

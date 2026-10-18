package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * The same files give the same bytes (wave 012, run 0061; the views themselves, run twice, are in {@code
 * BrightcartLayeredViewsTest}): {@code diff} in its three formats; {@code query views} and {@code query graph}, sorted and
 * identical from one run to the next (wave 011, issues #48, #49 and the sorted output of the CLI), on the layered
 * Brightcart.
 */
@QuarkusTest
class BrightcartStableOutputTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#verifiedIds")
    void diffGivesTheSameTextMarkdownAndJsonEveryTime(String id, @TempDir Path dir) {
        val workspace = Brightcart.copy(dir);
        val comparison = Brightcart.comparison(id);
        for (val format : List.of("text", "markdown", "json")) {
            val one = cli().diff(workspace, comparison, format);
            val two = cli().diff(workspace, comparison, format);
            assertEquals(0, one.exit(), one.err());
            assertEquals(one, two, id + " " + format);
            assertFalse(one.out().isBlank());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void queryViewsListsTheViewsSortedByIdThenLayerAndTheSameWayEveryTime(String plateau, @TempDir Path dir) {
        val workspace = Brightcart.copy(dir);
        val one = cli().in(workspace, List.of("query", "views", "--plateau", plateau), "-f", "json");
        val two = cli().in(workspace, List.of("query", "views", "--plateau", plateau), "-f", "json");
        assertEquals(0, one.exit(), one.err());
        assertEquals(one, two);
        val views = parse(one.out());
        assertTrue(views.size() > 50, plateau + " has views: " + views.size());
        val keys = new ArrayList<String>();
        for (val view : views) {
            keys.add(view.get("id").asText() + "\u0000" + view.get("layer").asText());
        }
        assertEquals(keys.stream().sorted().toList(), keys, plateau + " sorted by id, then layer");
        assertEquals(keys.size(), new TreeSet<>(keys).size(), "a view is listed once");
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void queryGraphIsTheSameEveryTime(String plateau, @TempDir Path dir) {
        val workspace = Brightcart.copy(dir);
        val one = cli().in(workspace, List.of("query", "graph", "--plateau", plateau));
        assertEquals(0, one.exit(), one.err());
        assertEquals(one, cli().in(workspace, List.of("query", "graph", "--plateau", plateau)));
    }

    @SneakyThrows
    private static JsonNode parse(String json) {
        return Brightcart.MAPPER.readTree(json);
    }
}

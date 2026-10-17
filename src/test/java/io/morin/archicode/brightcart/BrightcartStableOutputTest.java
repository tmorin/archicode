package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * The same files give the same bytes (wave 012, run 0061): {@code views generate} for the four plateaus and their
 * facets, run twice on two copies of {@code folders/} (and once more in the folder where the views already are);
 * {@code diff} in its three formats; {@code query views} and {@code query graph}, sorted and identical from one run to
 * the next (wave 011, issues #48, #49 and the sorted output of the CLI). The four plateaus exit 0, the comparison views
 * of {@code inhouse} and {@code marketplace} among the files compared (E1 of the document, fixed by W-3 of wave 012).
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

    /** The names of the folders of views next to the workspace. */
    @SneakyThrows
    private static List<String> viewFolders(Path workspace) {
        try (val files = Files.list(workspace.getParent())) {
            return files
                .filter(Files::isDirectory)
                .map(p -> p.getFileName().toString())
                .filter(n -> n.startsWith("views-"))
                .sorted()
                .toList();
        }
    }

    @Test
    void twoRunsOnTwoCopiesWriteTheSameFilesWithTheSameBytes(@TempDir Path dir) {
        val first = Brightcart.firstRun(cli());
        val second = Brightcart.generateAll(cli(), dir);
        for (val plateau : Brightcart.PLATEAUS) {
            assertEquals(
                first.results().get(plateau),
                second.results().get(plateau),
                plateau + ": exit code, output and messages"
            );
        }
        val folders = viewFolders(first.workspace());
        assertEquals(folders, viewFolders(second.workspace()));
        assertTrue(
            folders.size() >= 16,
            "the views of four plateaus, their facets and the comparisons that were drawn: " + folders
        );
        var compared = 0;
        for (val folder : folders) {
            val files = Brightcart.tree(first.views(folder));
            assertFalse(files.isEmpty(), folder);
            assertEquals("", Brightcart.difference(files, Brightcart.tree(second.views(folder))), folder);
            compared++;
        }
        assertTrue(compared >= 20, "the folders compared: " + compared);
        // the comparisons of the two plateaus that replace elements are among them (they stopped on E1, and half written)
        assertTrue(folders.contains("views-inhouse-vs-baseline"), folders.toString());
        assertTrue(folders.contains("views-marketplace-vs-inhouse"), folders.toString());
    }

    @Test
    void aRunInTheFolderWhereTheViewsAlreadyAreChangesNothing(@TempDir Path dir) {
        val first = Brightcart.firstRun(cli());
        val again = Brightcart.copyFolders(dir);
        for (val plateau : List.of("baseline", "saas")) {
            cli().generate(again, plateau);
            assertEquals(0, cli().generate(again, plateau).exit(), plateau);
        }
        for (val folder : viewFolders(again)) {
            assertEquals(
                Brightcart.tree(first.views(folder)),
                Brightcart.tree(again.getParent().resolve(folder)),
                folder
            );
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#verifiedIds")
    void diffGivesTheSameTextMarkdownAndJsonEveryTime(String id, @TempDir Path dir) {
        val workspace = Brightcart.copyFolders(dir);
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
        val workspace = Brightcart.copyFolders(dir);
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
        val workspace = Brightcart.copyFolders(dir);
        val one = cli().in(workspace, List.of("query", "graph", "--plateau", plateau));
        assertEquals(0, one.exit(), one.err());
        assertEquals(one, cli().in(workspace, List.of("query", "graph", "--plateau", plateau)));
    }

    @SneakyThrows
    private static JsonNode parse(String json) {
        return Brightcart.MAPPER.readTree(json);
    }
}

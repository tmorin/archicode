package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * {@code views generate} on the layered Brightcart (wave 014, run 0079): the four plateaus, each with its comparison with
 * the plateau it overrides and the views of the three facets, through the real command line, on a copy of
 * {@code layered/}. Three things are asked:
 *
 * <ul>
 *   <li>the four plateaus generate, exit 0 with an empty error output, and write the number of PlantUML files that
 *       {@code expected/sizes.json} gives, the comparison folders {@code views-<plateau>-vs-<against>} with their table;
 *   <li>the views are those of the complete folders, file for file: the layered engine and the old mechanism draw the same
 *       plateaus, so the PlantUML is the same bytes (the table of a comparison differs by the cascade of the {@code REMOVE},
 *       which only the layers know);
 *   <li>two runs give the same bytes.
 * </ul>
 */
@QuarkusTest
class BrightcartLayeredViewsTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    private Brightcart.Generated generated() {
        return Brightcart.firstLayeredRun(cli());
    }

    private static int sizeOfViews(String plateau) {
        return Brightcart.expected("sizes")
            .at("/plateaus/" + plateau + "/views")
            .asInt();
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void everyPlateauGeneratesAndExitsZeroWithNothingOnTheErrorOutput(String plateau) {
        val result = generated().results().get(plateau);
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void eachPlateauWritesTheNumberOfViewsOfTheDocument(String plateau) {
        val folder = generated().views("views-" + plateau);
        assertTrue(Files.isDirectory(folder.resolve("plantuml/application")), plateau);
        assertTrue(Files.isDirectory(folder.resolve("plantuml/technology")), plateau);
        assertEquals(sizeOfViews(plateau), Brightcart.puml(folder), plateau);
    }

    /** The comparison each plateau is drawn with: the plateau it overrides. The root is drawn alone. */
    private static Stream<Arguments> comparisons() {
        return Stream.of(
            Arguments.of("P1", "views-saas-vs-baseline"),
            Arguments.of("P2", "views-inhouse-vs-baseline"),
            Arguments.of("P3", "views-marketplace-vs-inhouse")
        );
    }

    @Test
    void theRootIsDrawnAloneAndEveryOtherPlateauWithTheComparisonToItsParent() {
        val names = viewFolders(generated().workspace());
        assertEquals(
            List.of(),
            names
                .stream()
                .filter(n -> n.startsWith("views-baseline-vs-"))
                .toList()
        );
        for (val id : List.of("P1", "P2", "P3")) {
            val comparison = Brightcart.comparison(id);
            val folder = "views-%s-vs-%s".formatted(
                comparison.at("/chain/1").asText(),
                comparison.at("/chain/0").asText()
            );
            assertTrue(names.contains(folder), folder + " in " + names);
        }
        // four plateaus, three facets each, and the comparisons of three plateaus (with a facet each, whose views are drawn too)
        assertTrue(names.size() >= 16, names.toString());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("comparisons")
    void theComparisonViewsAreWrittenWithTheTableOfChangesAndTheCascade(String id, String folderName) {
        val folder = generated().views(folderName);
        assertTrue(Files.isDirectory(folder.resolve("plantuml/application")), folderName);
        assertTrue(Files.isDirectory(folder.resolve("plantuml/technology")), folderName);
        assertTrue(Files.isRegularFile(folder.resolve("gap.md")), folderName);
        assertTrue(Brightcart.puml(folder) > 0, folderName);
        // the table is the one `archicode diff` prints for the same pair, byte for byte
        val diff = cli().layeredDiff(generated().workspace(), Brightcart.comparison(id), "json");
        assertEquals(0, diff.exit(), diff.err());
        assertEquals(diff.out(), read(folder.resolve("gap.json")), folderName);
        assertTrue(read(folder.resolve("gap.md")).contains("## Cascade of the removals"), folderName);
    }

    /** N13 in P1, P2 and P3: the boxes that have no change of their own and hold one say so in the comparison views. */
    @ParameterizedTest(name = "{0}")
    @MethodSource("comparisons")
    void theBoxesThatContainChangesAreDrawnAsSuch(String id, String folderName) {
        val folder = generated().views(folderName + "/plantuml");
        var checked = 0;
        var named = 0;
        for (val notable : Brightcart.expected("notable-cases")) {
            if (!notable.get("id").asText().equals("N13")) {
                continue;
            }
            for (val check : notable.get("checks")) {
                if (!check.get("in").asText().equals(id)) {
                    continue;
                }
                named++;
                val boxes = boxesOf(folder.resolve(check.get("layer").asText()), check.get("ref").asText());
                assertFalse(boxes.isEmpty(), check.get("ref").asText() + " is drawn in the comparison views");
                assertTrue(
                    boxes.stream().allMatch(b -> b.contains("<<contains-changes>>")),
                    check.get("ref").asText() + ": " + boxes
                );
                checked++;
            }
        }
        assertTrue(named >= 1, "the file names boxes of N13 in " + id);
        assertEquals(named, checked);
    }

    /** The lines that open the box of an element in the views of a layer: {@code rectangle <reference> ...}. */
    @SneakyThrows
    private static List<String> boxesOf(Path layer, String reference) {
        try (val files = Files.walk(layer)) {
            return files
                .filter(f -> f.toString().endsWith(".puml"))
                .flatMap(f ->
                    read(f)
                        .lines()
                        .filter(l -> l.startsWith("rectangle " + reference + " "))
                )
                .distinct()
                .toList();
        }
    }

    /**
     * The proof of the two mechanisms against each other, on the drawings: every folder of views that the run on
     * {@code folders/} wrote, the layered run wrote, with the same files and the same bytes. The only differences are in the
     * two files of a comparison that hold the table: the layers know the cascade of a {@code REMOVE}, the complete folders do
     * not, so {@code gap.json} has one more key and {@code gap.md} one more section at its end.
     */
    @Test
    void theViewsAreTheOnesOfTheCompleteFoldersFileForFile() {
        val old = Brightcart.firstRun(cli());
        val names = viewFolders(generated().workspace());
        assertEquals(viewFolders(old.workspace()), names, "the same folders of views");
        var compared = 0;
        for (val name : names) {
            val layered = Brightcart.tree(generated().views(name));
            val complete = Brightcart.tree(old.views(name));
            assertEquals(complete.keySet(), layered.keySet(), name + ": the same files");
            for (val file : complete.keySet()) {
                if (file.equals("gap.json")) {
                    val one = readTree(complete.get(file));
                    val two = readTree(layered.get(file));
                    assertTrue(two.has("cascade"), name + " lists the cascade");
                    ((ObjectNode) two).remove("cascade");
                    assertEquals(one, two, name + "/gap.json without the cascade");
                } else if (file.equals("gap.md")) {
                    assertTrue(
                        layered.get(file).startsWith(complete.get(file).stripTrailing()),
                        name + "/gap.md is the same table, the cascade after it"
                    );
                } else {
                    assertEquals(complete.get(file), layered.get(file), name + "/" + file);
                }
                compared++;
            }
        }
        assertTrue(compared > 1000, "files compared: " + compared);
    }

    // ---- stable output

    /**
     * The plateaus run twice: {@code saas} (a plateau with a comparison) and {@code marketplace} (the deepest one, whose
     * comparison has the longest cascade). A run of a plateau takes about twenty seconds in the process, so the second
     * run does not repeat the four.
     */
    private static final List<String> TWICE = List.of("saas", "marketplace");

    @Test
    void twoRunsOnTwoCopiesWriteTheSameFilesWithTheSameBytes(@TempDir Path dir) {
        val first = generated();
        val second = Brightcart.generateLayered(cli(), dir, TWICE);
        for (val plateau : TWICE) {
            assertEquals(
                first.results().get(plateau),
                second.results().get(plateau),
                plateau + ": exit code, output and messages"
            );
        }
        val again = viewFolders(second.workspace());
        val compared = viewFolders(first.workspace())
            .stream()
            .filter(f -> TWICE.stream().anyMatch(p -> f.equals("views-" + p) || f.startsWith("views-" + p + "-")))
            .toList();
        assertEquals(compared, again, "the folders of the plateaus run twice");
        for (val folder : compared) {
            val files = Brightcart.tree(first.views(folder));
            assertFalse(files.isEmpty(), folder);
            assertEquals("", Brightcart.difference(files, Brightcart.tree(second.views(folder))), folder);
        }
        assertTrue(compared.size() >= 8, "the folders compared: " + compared);
        assertTrue(compared.contains("views-marketplace-vs-inhouse"), compared.toString());
    }

    @Test
    void aRunInTheFolderWhereTheViewsAlreadyAreChangesNothing(@TempDir Path dir) {
        val first = generated();
        val again = Brightcart.copyLayered(dir);
        for (val plateau : List.of("baseline", "saas")) {
            assertEquals(0, cli().generate(again, plateau).exit(), plateau);
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

    // ---- the facets, on the layers

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void everyPlateauHasTheViewsOfEachFacet(String plateau) {
        for (val facet : Brightcart.FACETS) {
            val folder = generated().views("views-" + plateau + "-" + facet);
            assertTrue(Files.isDirectory(folder.resolve("plantuml/application")), plateau + " " + facet);
            assertTrue(Brightcart.puml(folder) > 0, plateau + " " + facet);
        }
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

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    @SneakyThrows
    private static JsonNode readTree(String json) {
        return Brightcart.MAPPER.readTree(json);
    }
}

package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
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
 * {@code views generate} on the layered Brightcart (waves 012 and 014): the four plateaus, each with its comparison with
 * the plateau it overrides and the views of the three facets, through the real command line, on a copy of
 * {@code layered/}. Three things are asked:
 *
 * <ul>
 *   <li>the four plateaus generate, exit 0 with an empty error output, and write the number of PlantUML files that
 *       {@code expected/sizes.json} gives, the comparison folders {@code views-<plateau>-vs-<against>} with their table;
 *   <li>the facets do what their actions say on every plateau;
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
        return Brightcart.firstRun(cli());
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
        val diff = cli().diff(generated().workspace(), Brightcart.comparison(id), "json");
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
            if (!"N13".equals(notable.get("id").asText())) {
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
        val second = Brightcart.generate(cli(), dir, TWICE);
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
        val again = Brightcart.copy(dir);
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

    private static Set<String> applicationViews(Path views) {
        try (val files = Files.list(views.resolve("plantuml/application"))) {
            return files.map(f -> f.getFileName().toString()).collect(Collectors.toCollection(TreeSet::new));
        } catch (java.io.IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    private static boolean about(String file, String id) {
        return file.startsWith(id + "-") || file.startsWith(id + "_");
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void journeyLeavesNoStaffToolsAndNoFulfilment(String plateau) {
        val plain = applicationViews(generated().views("views-" + plateau));
        val journey = applicationViews(generated().views("views-" + plateau + "-journey"));
        for (val id : List.of("agent", "merchandiser", "backoffice", "fulfilment")) {
            assertTrue(plain.stream().anyMatch(f -> about(f, id)), plateau + " has " + id + " in its own views");
            assertTrue(journey.stream().noneMatch(f -> about(f, id)), plateau + " journey: " + id);
        }
        assertTrue(journey.size() < plain.size());
        assertTrue(plain.containsAll(journey), "a facet only takes away");
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void noExternalsLeavesNoPaymentProviderSystem(String plateau) {
        val plain = applicationViews(generated().views("views-" + plateau));
        val without = applicationViews(generated().views("views-" + plateau + "-no-externals"));
        assertTrue(plain.contains("psp-overview.puml"), plateau);
        assertFalse(without.contains("psp-overview.puml"), plateau);
        assertTrue(without.size() < plain.size());
        assertTrue(plain.containsAll(without), "a facet only takes away");
    }

    @Test
    void withoutCartTakesTheCartAwayWhereThereIsOneAndSelectsNothingInSaasAndStillGenerates() {
        for (val plateau : List.of("baseline", "inhouse", "marketplace")) {
            val plain = applicationViews(generated().views("views-" + plateau));
            val without = applicationViews(generated().views("views-" + plateau + "-without-cart"));
            val cart = plain
                .stream()
                .filter(f -> about(f, "shop_app_cart") || about(f, "commerce_cart"))
                .toList();
            assertFalse(cart.isEmpty(), plateau + " has a cart in its own views");
            assertTrue(without.size() < plain.size(), plateau);
        }
        // `saas` has no cart (the commerce platform has it): the facet selects nothing, the views are the same files
        val plain = generated().views("views-saas");
        val without = generated().views("views-saas-without-cart");
        assertEquals(applicationViews(plain), applicationViews(without));
        assertEquals(Brightcart.puml(plain), Brightcart.puml(without));
        // and the application views are the same bytes: only the technology views, which a facet draws as flows, differ
        val applicationOfPlain = Brightcart.tree(plain.resolve("plantuml/application"));
        assertFalse(applicationOfPlain.isEmpty());
        assertEquals(applicationOfPlain, Brightcart.tree(without.resolve("plantuml/application")));
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
}

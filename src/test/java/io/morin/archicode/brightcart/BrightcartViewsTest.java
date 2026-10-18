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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * {@code views generate} on Brightcart (wave 012, run 0061): the four plateaus and the three facets of the workspace
 * ({@code journey}, {@code no-externals}, {@code without-cart}), through the real command line, on a copy of
 * {@code folders/}. The number of PlantUML files each plateau gives is the one of {@code expected/sizes.json}; what a
 * facet takes away is read off the files.
 *
 * <p>The four plateaus generate and exit 0. {@code inhouse} and {@code marketplace} have a {@code baseline} key, so the
 * command also draws their comparison; that stopped on a dangling reference (E1 of section 12 of the document, fixed by W-3
 * of wave 012), and the test now asserts the comparison views of both, with the table of changes and the boxes that
 * contain changes (N13 in P2 and P3).
 */
@QuarkusTest
class BrightcartViewsTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    private Brightcart.Generated generated() {
        return Brightcart.firstRun(new Brightcart.Cli(factory, errorOutput));
    }

    private static int sizeOfViews(String plateau) {
        return Brightcart.expected("sizes")
            .at("/plateaus/" + plateau + "/views")
            .asInt();
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void everyPlateauGeneratesAndExitsZero(String plateau) {
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

    @Test
    void aPlateauWithNoBaselineDrawsNoComparison() {
        assertFalse(Files.exists(generated().views("views-baseline-vs-baseline")));
        try (val folders = Files.list(generated().workspace().getParent())) {
            assertEquals(
                List.of(),
                folders
                    .map(p -> p.getFileName().toString())
                    .filter(n -> n.startsWith("views-baseline") && n.contains("-vs-"))
                    .toList()
            );
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void saasIsDrawnWithItsComparisonToBaselineAndTheTableOfChanges() {
        val folder = generated().views("views-saas-vs-baseline");
        assertTrue(Files.isDirectory(folder.resolve("plantuml/application")));
        assertTrue(Files.isRegularFile(folder.resolve("gap.md")));
        // the same table as `archicode diff` (P1)
        val diff = new Brightcart.Cli(factory, errorOutput).diff(
            generated().workspace(),
            Brightcart.comparison("P1"),
            "json"
        );
        assertEquals(0, diff.exit(), diff.err());
        assertEquals(diff.out(), read(folder.resolve("gap.json")));
        // what only the baseline had has views in the comparison and none in the plateau
        assertTrue(Files.exists(folder.resolve("plantuml/application/shop_app_cart-overview.puml")));
        assertFalse(
            Files.exists(generated().views("views-saas").resolve("plantuml/application/shop_app_cart-overview.puml"))
        );
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    /**
     * The comparisons a plateau with a {@code baseline} draws: the id of the comparison of the document, the folder, and
     * the plateau it is made of.
     */
    private static Stream<Arguments> comparisons() {
        return Stream.of(
            Arguments.of("P1", "views-saas-vs-baseline"),
            Arguments.of("P2", "views-inhouse-vs-baseline"),
            Arguments.of("P3", "views-marketplace-vs-inhouse")
        );
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("comparisons")
    void theComparisonViewsOfEachPlateauAreWrittenWithTheTableOfChanges(String id, String folderName) {
        val folder = generated().views(folderName);
        assertTrue(Files.isDirectory(folder.resolve("plantuml/application")), folderName);
        assertTrue(Files.isDirectory(folder.resolve("plantuml/technology")), folderName);
        assertTrue(Files.isRegularFile(folder.resolve("gap.md")), folderName);
        assertTrue(Brightcart.puml(folder) > 0, folderName);
        // the table is the one `archicode diff` prints for the same pair
        val diff = new Brightcart.Cli(factory, errorOutput).diff(
            generated().workspace(),
            Brightcart.comparison(id),
            "json"
        );
        assertEquals(0, diff.exit(), diff.err());
        assertEquals(diff.out(), read(folder.resolve("gap.json")), folderName);
    }

    /**
     * N13 in P1, P2 and P3: the boxes that have no change of their own and hold one say so in the comparison views
     * (the P2 and P3 views stopped on E1 before W-3 of wave 012).
     */
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
                    continue; // P4 is the model's
                }
                named++;
                val layer = check.get("layer").asText();
                val reference = check.get("ref").asText();
                val boxes = boxesOf(folder.resolve(layer), reference);
                assertFalse(boxes.isEmpty(), reference + " is drawn in the comparison views");
                assertTrue(boxes.stream().allMatch(b -> b.contains("<<contains-changes>>")), reference + ": " + boxes);
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

    // ---- the facets

    /** The names of the application views a folder holds, without the extension. */
    @SneakyThrows
    private static Set<String> applicationViews(Path views) {
        try (val files = Files.list(views.resolve("plantuml/application"))) {
            return files.map(f -> f.getFileName().toString()).collect(Collectors.toCollection(TreeSet::new));
        }
    }

    private static boolean about(String file, String id) {
        return file.startsWith(id + "-") || file.startsWith(id + "_");
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void everyPlateauHasTheViewsOfEachFacet(String plateau) {
        for (val facet : Brightcart.FACETS) {
            val folder = generated().views("views-" + plateau + "-" + facet);
            assertTrue(Files.isDirectory(folder.resolve("plantuml/application")), plateau + " " + facet);
            assertTrue(Brightcart.puml(folder) > 0, plateau + " " + facet);
        }
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
}

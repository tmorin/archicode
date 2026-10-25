package io.morin.archicode.viewpoint.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * Candidates of {@code replaces} between two plateaus that are not one the past of the other (wave 014, issue #70), and the
 * states of a comparison said once by the kernel (issue #34): kernel contract 5.
 *
 * <p>The layered Brightcart is the case: {@code saas} and {@code inhouse} both override {@code baseline} (two alternatives),
 * and the node that hosts the commerce platform in one and the node that hosts the tax service in the other are the only
 * nodes of their kind under {@code partners} (and the two sandbox nodes under {@code sandbox}). Between a plateau and its
 * past, the same pairs are the legitimate case.
 */
@QuarkusTest
class SiblingCandidatesTest {

    private static final Path BRIGHTCART = Path.of("src/test/resources/brightcart/layered/.archicode.yaml");

    @Inject
    WorkspaceFactory workspaceFactory;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Workspace plateau(String id) {
        return workspaceFactory.create(BRIGHTCART.toAbsolutePath(), null, id);
    }

    private Comparison compare(String base, String target) {
        return new PlateauComparer(objectMapper).compare(plateau(base), plateau(target));
    }

    private static List<String> pairs(Comparison comparison) {
        return comparison
            .getCandidates()
            .stream()
            .map(c -> c.layer() + ":" + c.from() + " -> " + c.to() + " " + c.reasons())
            .toList();
    }

    /**
     * The plateaus a plateau stands on since the one it shares with another (wave 017, issue #89), which the kernel composes the
     * {@code replaces} of the layers from.
     */
    @Test
    void theTreeSaysWhichPlateausATargetStandsOnSinceTheOneItSharesWithTheBase() {
        val tree = workspaceFactory.plateauTree(BRIGHTCART.toAbsolutePath());
        val ids = (java.util.function.BiFunction<String, String, List<String>>) (target, base) ->
            tree.standsOn(target, base).stream().map(PlateauTree.Node::id).toList();
        assertEquals(List.of("baseline", "inhouse"), ids.apply("marketplace", "baseline"));
        assertEquals(List.of("inhouse"), ids.apply("marketplace", "inhouse"));
        assertEquals(
            List.of("baseline", "inhouse"),
            ids.apply("marketplace", "saas"),
            "siblings: since baseline, which they share"
        );
        assertEquals(List.of("baseline"), ids.apply("inhouse", "saas"));
        assertEquals(List.of("baseline"), ids.apply("saas", "baseline"));
        assertEquals(List.of(), ids.apply("baseline", "marketplace"), "the target is the past of the base");
        assertEquals(List.of(), ids.apply("baseline", "baseline"));
        assertEquals(List.of(), ids.apply("inhouse", "marketplace"));
        assertThrows(ArchiCodeException.class, () -> tree.standsOn("saas", "nowhere"));
    }

    @Test
    void theTreeSaysWhichPlateausAreOneThePastOfTheOther() {
        val tree = workspaceFactory.plateauTree(BRIGHTCART.toAbsolutePath());
        for (val pair : List.of(
            List.of("baseline", "saas"),
            List.of("saas", "baseline"),
            List.of("baseline", "marketplace"),
            List.of("inhouse", "marketplace"),
            List.of("marketplace", "inhouse"),
            List.of("saas", "saas")
        )) {
            assertTrue(tree.onOneChain(pair.get(0), pair.get(1)), pair.toString());
        }
        for (val pair : List.of(
            List.of("saas", "inhouse"),
            List.of("inhouse", "saas"),
            List.of("saas", "marketplace"),
            List.of("marketplace", "saas")
        )) {
            assertFalse(tree.onOneChain(pair.get(0), pair.get(1)), pair.toString());
        }
        assertThrows(ArchiCodeException.class, () -> tree.onOneChain("saas", "nowhere"));
    }

    @Test
    void theComparerReadsItFromTheTreeTheTwoPlateausWereLoadedFrom() {
        assertTrue(PlateauComparer.onOneChain(plateau("baseline"), plateau("saas")));
        assertTrue(PlateauComparer.onOneChain(plateau("marketplace"), plateau("inhouse")));
        assertFalse(PlateauComparer.onOneChain(plateau("saas"), plateau("inhouse")));
    }

    @Test
    void siblingsAreNotOfferedThePairsOfNodesThatOnlyShareAParent() {
        val comparison = compare("saas", "inhouse");
        assertEquals(List.of(), pairs(comparison), "neither commerce-live/tax-live nor the two sandbox nodes");
        // nothing else moved: the nodes are still removed and new
        assertTrue(
            comparison
                .getElements()
                .stream()
                .anyMatch(e -> "partners.commerce-live".equals(e.reference()) && "removed".equals(e.change().word()))
        );
        assertTrue(
            comparison
                .getElements()
                .stream()
                .anyMatch(e -> "partners.tax-live".equals(e.reference()) && "new".equals(e.change().word()))
        );
    }

    @Test
    void aPlateauAndItsPastStillGetThem() {
        // saas against baseline: the tax node is swapped for the commerce one (the swap of the document, N15)
        assertEquals(
            List.of(
                "technology:partners.tax-live -> partners.commerce-live [parent]",
                "technology:sandbox.tax-sandbox -> sandbox.commerce-sandbox [parent]"
            ),
            pairs(compare("baseline", "saas"))
        );
        // and a plateau with the one that builds on it (the direction `diff --plateau inhouse --against marketplace` asks): a chain too, the pairs are kept
        assertEquals(
            List.of(
                "application:discovery.search -> commerce.search [name, description]",
                "application:storefront -> shop [name, description]",
                "application:storefront.web -> shop.web [name]"
            ),
            pairs(compare("marketplace", "inhouse"))
        );
    }

    @Test
    void theSamePairToldAsSiblingsOrNotDiffersOnlyByTheParent() {
        val inhouse = plateau("inhouse");
        val saas = plateau("saas");
        val comparer = new PlateauComparer(objectMapper);
        val siblings = comparer.compare(saas, inhouse, false);
        val chain = comparer.compare(saas, inhouse, true);
        assertEquals(
            List.of(
                "technology:partners.commerce-live -> partners.tax-live [parent]",
                "technology:sandbox.commerce-sandbox -> sandbox.tax-sandbox [parent]"
            ),
            pairs(chain),
            "the pairs of issue #70, if the two plateaus were told to be one chain"
        );
        assertEquals(List.of(), pairs(siblings));
        // the union, the table and the counts are the same
        assertEquals(chain.getCounts().toString(), siblings.getCounts().toString());
        assertEquals(chain.getElements(), siblings.getElements());
        assertEquals(
            new TreeSet<>(chain.getChanges().stream().map(Object::toString).toList()),
            new TreeSet<>(siblings.getChanges().stream().map(Object::toString).toList())
        );
    }

    @Test
    @SneakyThrows
    void theKernelRefusesAComparisonThatDoesNotSayWhetherThePlateausAreOnOneChain() {
        for (val input : List.of(
            "{\"base\":{\"application\":[]},\"target\":{\"application\":[]}}",
            "{\"base\":{\"application\":[]},\"target\":{\"application\":[]},\"on_one_chain\":null}"
        )) {
            val answer = objectMapper.readTree(ViewpointKernel.getInstance().compare(input));
            assertTrue(
                answer.get("error").asText().startsWith("invalid input: `on_one_chain` is missing"),
                answer.toString()
            );
            assertEquals(List.of("error"), List.copyOf(fieldNames(answer)), "no partial answer");
            // and the adapter turns it into the one error of the command line, not a stack trace
            val refused = assertThrows(ArchiCodeException.class, () -> Comparison.of(answer));
            assertTrue(refused.getMessage().contains("`on_one_chain` is missing"), refused.getMessage());
        }
    }

    private static List<String> fieldNames(JsonNode node) {
        val names = new java.util.ArrayList<String>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    @Test
    void theStatesAreTheKernelsAndNobodyElses() {
        assertEquals(
            List.of("new", "changed", "removed", "moved", "split", "merged", "contains-changes"),
            KernelStates.all()
        );
        assertEquals("contains-changes", KernelStates.container());
        assertEquals(new TreeSet<>(KernelStates.all()), new TreeSet<>(KernelStates.words()));
        // every word of the enum of changes that is not none is one of them, and reads back as itself
        for (val change : io.morin.archicode.viewpoint.Change.values()) {
            if (change.isChange()) {
                assertTrue(KernelStates.words().contains(change.word()), change.word());
            }
        }
    }
}

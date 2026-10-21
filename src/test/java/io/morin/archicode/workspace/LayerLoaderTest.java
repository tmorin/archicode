package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.LayeredFixtures;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Component;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Nesting;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.application.Person;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * A layered plateau is loaded as its chain (run 0078, wave 014, W-4): for each plateau from the root, the manifests that say
 * {@code plateau: <layer>} are added to the graph, then the patches of the layer change it; the references, views and stories
 * of a layer are checked when the layer is built and a mistake names the layer.
 *
 * <p>The workspace is {@link LayeredFixtures}, written into a temporary folder.
 */
@QuarkusTest
class LayerLoaderTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private int written;

    /** A folder of its own for each workspace a test writes: a file removed from the map is not left from the one before. */
    private Path fresh() {
        return dir.resolve("w" + written++);
    }

    private Workspace load(String plateau) {
        return workspaceFactory.create(LayeredFixtures.write(fresh()), null, plateau);
    }

    private Workspace load(Map<String, String> files, String plateau) {
        return workspaceFactory.create(LayeredFixtures.write(fresh(), files), null, plateau);
    }

    private String errorOf(Map<String, String> files, String plateau) {
        return assertThrows(ArchiCodeException.class, () -> load(files, plateau)).getMessage();
    }

    @Test
    void baselineIsTheManifestsThatNameNoPlateau() {
        val baseline = load("baseline");
        assertEquals("baseline", baseline.getPlateau().getId());
        assertNull(baseline.getPlateau().getBaseline(), "the root overrides nothing");
        assertTrue(baseline.appIndex.searchElement("shop.cache").isPresent());
        assertTrue(baseline.appIndex.searchElement("backoffice.console").isPresent());
        assertTrue(
            baseline.appIndex.searchElement("commerce").isEmpty(),
            "the manifests of inhouse are not in baseline"
        );
        assertTrue(baseline.appIndex.searchElement("sellers").isEmpty());
        assertTrue(baseline.getRemovals().isEmpty());
        assertEquals(Set.of("baseline", "inhouse", "marketplace", "saas"), Set.copyOf(baseline.getPlateauTree().ids()));
    }

    @Test
    void removeTakesTheElementAndWhatPointsAtIt() {
        val inhouse = load("inhouse");
        assertTrue(inhouse.appIndex.searchElement("shop.cache").isEmpty());
        assertEquals(
            Set.of("shop.db"),
            Set.copyOf(
                inhouse.appIndex
                    .getElementByReference("shop.api")
                    .getRelationships()
                    .stream()
                    .map(r -> r.getDestination())
                    .toList()
            ),
            "the relationship towards the element that left went with it"
        );
        assertTrue(
            inhouse.appIndex
                .getElementByReference("backoffice.console")
                .getRelationships()
                .stream()
                .noneMatch(r -> r.getDestination().equals("shop.cache"))
        );
        assertEquals(
            Set.of("shop.web", "shop.api", "shop.db"),
            ((Node) inhouse.techIndex.getElementByReference("prod.vm")).getApplications(),
            "and so did the entry of the node that hosted it"
        );
        assertTrue(inhouse.appIndex.searchElement("shop").isPresent(), "the system that hosted it stays");
    }

    @Test
    void setAddAndMergeChangeAFieldAndSetWithWhereChangesOneRelationship() {
        val inhouse = load("inhouse");
        assertEquals("Web storefront v2", inhouse.appIndex.getElementByReference("shop.web").getName());
        val api = inhouse.appIndex.getElementByReference("shop.api");
        assertTrue(api.getQualifiers().contains("Java"), "ADD appends to a list");
        val toDb = api
            .getRelationships()
            .stream()
            .filter(r -> r.getDestination().equals("shop.db"))
            .toList();
        assertEquals(1, toDb.size());
        assertEquals(
            "writes",
            toDb.get(0).getLabel(),
            "SET with where changes the relationship found by (destination, label)"
        );
        // the patch of the layer reaches an element the layer has just added
        assertEquals(
            Map.of("runtime", "quarkus"),
            inhouse.appIndex.getElementByReference("commerce.cart").getTags(),
            "MERGE sets the keys of an object"
        );
        // the layers below do not see it
        val baseline = load("baseline");
        assertEquals("Web storefront", baseline.appIndex.getElementByReference("shop.web").getName());
    }

    @Test
    void aPlateauIsItsChain() {
        val marketplace = load("marketplace");
        // inhouse first: its elements and its patches, then marketplace's
        assertEquals("Web storefront v2", marketplace.appIndex.getElementByReference("shop.web").getName());
        assertTrue(marketplace.appIndex.searchElement("shop.cache").isEmpty());
        assertTrue(marketplace.appIndex.searchElement("commerce.cart").isPresent());
        assertTrue(marketplace.appIndex.searchElement("sellers").isPresent());
        assertTrue(marketplace.appIndex.searchElement("backoffice.console").isEmpty());
        // a json-path that expects two nodes, on elements that arrived with inhouse
        assertEquals(
            Map.of("runtime", "quarkus", "tier", "gold"),
            marketplace.appIndex.getElementByReference("commerce.cart").getTags()
        );
        assertEquals(Map.of("tier", "gold"), marketplace.appIndex.getElementByReference("commerce.catalog").getTags());
        assertEquals("marketplace", marketplace.getPlateau().getId());
        assertEquals("Marketplace", marketplace.getPlateau().getName());
        assertEquals("2028-Q1", marketplace.getPlateau().getHorizon());
        assertEquals("inhouse", marketplace.getPlateau().getBaseline(), "what the plateau overrides");
        assertEquals(
            java.util.List.of("inhouse", "marketplace"),
            marketplace.getRemovals().stream().map(Removal::plateau).toList()
        );
    }

    @Test
    void aSiblingDoesNotSeeTheOther() {
        val saas = load("saas");
        assertTrue(saas.appIndex.searchElement("platform").isPresent());
        assertTrue(saas.appIndex.searchElement("commerce").isEmpty());
        assertTrue(saas.appIndex.searchElement("shop.cache").isPresent(), "saas does not remove it");
        assertEquals("baseline", saas.getPlateau().getBaseline());
    }

    @Test
    void theViewsFolderIsNamedAfterThePlateau() {
        assertEquals("views-inhouse", load("inhouse").getSettings().getViews().getPath());
        assertEquals("views-baseline", load("baseline").getSettings().getViews().getPath());
        val files = LayeredFixtures.files();
        assertEquals(
            "out-saas",
            workspaceFactory
                .create(LayeredFixtures.write(fresh(), files), Path.of("out"), "saas")
                .getSettings()
                .getViews()
                .getPath()
        );
    }

    @Test
    void aPatchThatSelectsNothingNamesThePlateauTheRankAndTheSelector() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.INHOUSE,
            files.get(LayeredFixtures.INHOUSE).replace("target: shop.web", "target: shop.webb")
        );
        val message = errorOf(files, "inhouse");
        assertEquals(
            "plateau inhouse: patch 2 (SET target shop.webb): selects nothing, there is no element shop.webb in the application layer",
            message
        );
        assertFalse(message.contains("\n"), "one line");
        // the layers below the one that misses are fine, the layers above are not looked at
        assertNotNull(load(files, "baseline"));
        assertEquals(message, errorOf(files, "marketplace"));
    }

    @Test
    void aJsonPathThatDoesNotSelectWhatItExpectsIsTheSameKindOfMistake() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.MARKETPLACE,
            files.get(LayeredFixtures.MARKETPLACE).replace("expect: 2", "expect: 3")
        );
        val message = errorOf(files, "marketplace");
        assertTrue(message.startsWith("plateau marketplace: patch 1 (MERGE json-path "), message);
        assertTrue(message.contains("expect"), message);
        assertFalse(message.contains("\n"));
    }

    @Test
    void aReferenceThatDanglesAfterALayerNamesTheLayer() {
        val files = LayeredFixtures.files();
        // inhouse adds a relationship towards an element that nothing declares
        files.put(
            LayeredFixtures.INHOUSE,
            files.get(LayeredFixtures.INHOUSE) +
                """
                    - operator: ADD
                      target: shop.web
                      field: relationships
                      value:
                        destination: nowhere
                        label: calls
                """
        );
        assertEquals(
            "in the plateau `inhouse`, `shop.web` has a relationship towards `nowhere`, which does not exist",
            errorOf(files, "inhouse")
        );
        assertEquals(
            "in the plateau `inhouse`, `shop.web` has a relationship towards `nowhere`, which does not exist",
            errorOf(files, "marketplace"),
            "a plateau that overrides it says the same, and names the layer that is wrong"
        );
        assertNotNull(load(files, "baseline"));
        assertNotNull(load(files, "saas"), "a sibling is not concerned");
    }

    @Test
    void aRemovalThatLeavesAnEntryOfAListInAPatchBehindIsToldAfterThatLayer() {
        val files = LayeredFixtures.files();
        // the patch copies a list that names the element that the plateau above removed (the stale list)
        files.put(
            LayeredFixtures.MARKETPLACE,
            files.get(LayeredFixtures.MARKETPLACE) +
                """
                    - operator: SET
                      target: prod.vm
                      layer: technology
                      field: applications
                      value: ["shop.web", "shop.cache"]
                """
        );
        assertEquals(
            "in the plateau `marketplace`, `prod.vm` hosts `shop.cache`, which does not exist",
            errorOf(files, "marketplace")
        );
    }

    @Test
    void aManifestOfALayerCanBePlacedUnderAnElementOfAnAncestor() {
        val files = LayeredFixtures.files();
        files.put(
            "plateaus/inhouse/queue.yaml",
            """
            header:
              kind: "archicode.morin.io/container"
              version: "1"
              plateau: inhouse
              parent: "shop"
            content:
              id: "queue"
              name: "Queue"
              relationships:
                - destination: "shop.db"
            """
        );
        val inhouse = load(files, "inhouse");
        assertTrue(inhouse.appIndex.searchElement("shop.queue").isPresent());
        assertTrue(load(files, "marketplace").appIndex.searchElement("shop.queue").isPresent());
        assertTrue(load(files, "baseline").appIndex.searchElement("shop.queue").isEmpty());
        assertTrue(load(files, "saas").appIndex.searchElement("shop.queue").isEmpty());
    }

    @Test
    void anElementDeclaredUnderAParentThatIsNotThereIsToldWithItsLayer() {
        val files = LayeredFixtures.files();
        files.put(
            "plateaus/marketplace/cdn.yaml",
            """
            header:
              kind: "archicode.morin.io/container"
              version: "1"
              plateau: marketplace
              parent: "shop.web2"
            content:
              id: "cdn"
              name: "CDN"
            """
        );
        assertEquals(
            "in the plateau `marketplace`, `shop.web2.cdn` is declared under `shop.web2`, which does not exist",
            errorOf(files, "marketplace")
        );
    }

    @Test
    void aViewAndAStoryBelongToNoPlateauAndAreCheckedOnceAgainstEveryPlateau() {
        val files = LayeredFixtures.files();
        // `commerce.cart` is declared by inhouse only (the Brightcart fixture): a view that names it is the workspace's, and
        // it is no mistake in baseline, which does not have the element: it exists in a plateau
        files.put(
            "plateaus/view.cart.yaml",
            """
            header:
              kind: "archicode.morin.io/view"
              version: "1"
            content:
              id: "cart_overview"
              viewpoint: "overview"
              properties:
                element: "commerce.cart"
            """
        );
        for (val plateau : List.of("baseline", "inhouse", "marketplace", "saas")) {
            assertEquals(
                1,
                load(files, plateau).getViews().size(),
                "the view is there whatever plateau is loaded: " + plateau
            );
        }
        // a name that no plateau declares is told once, with the file, whatever plateau is asked for
        files.put(
            "plateaus/view.cart.yaml",
            files.get("plateaus/view.cart.yaml").replace("commerce.cart", "commerce.cartt")
        );
        for (val plateau : List.of("baseline", "inhouse")) {
            assertEquals(
                "the view `cart_overview` (`plateaus/view.cart.yaml`) names `commerce.cartt`, which exists in no plateau",
                errorOf(files, plateau)
            );
        }
        files.remove("plateaus/view.cart.yaml");
        files.put(
            "plateaus/story.tour.yaml",
            """
            header:
              kind: "archicode.morin.io/story"
              version: "1"
            content:
              id: "tour"
              steps:
                - viewpoint: map
                  layer: application
                  properties:
                    pinned: ["sellers", "ghost"]
                  text: "Sellers."
            """
        );
        assertEquals(
            "the story `tour` (`plateaus/story.tour.yaml`) names `ghost`, which exists in no plateau",
            errorOf(files, "baseline")
        );
    }

    @Test
    void aLayerWithPatchesGivesBackWhatItDoesNotTouchAsItWent() {
        val files = LayeredFixtures.files();
        // what the mapper of the files leaves out when it writes: an empty tag, an empty label, and a replaces as it was written
        files.put(
            "manifests/shop.yaml",
            files
                .get("manifests/shop.yaml")
                .replace(
                    "      name: \"Shop database\"\n",
                    "      name: \"Shop database\"\n      tags:\n        empty: \"\"\n      replaces: [old, old, 3]\n"
                )
                .replace("label: \"calls\"", "label: \"\"")
        );
        // inhouse has patches (the elements go through the kernel as JSON), baseline has none
        for (val plateau : new String[] { "baseline", "inhouse" }) {
            val loaded = load(files, plateau);
            val db = loaded.appIndex.getElementByReference("shop.db");
            assertEquals("", db.getTags().get("empty"), plateau + ": the tag with no text is still there");
            assertEquals(
                "[\"old\",\"old\",3]",
                ((io.morin.archicode.resource.element.Replaces) db.getReplaces()).getWritten().toString(),
                plateau + ": replaces is as the author wrote it, so that the kernel can warn of it"
            );
            val calls = loaded.appIndex
                .getElementByReference("shop.web")
                .getRelationships()
                .stream()
                .filter(r -> r.getDestination().equals("shop.api"))
                .toList();
            assertEquals("", calls.get(0).getLabel(), plateau + ": the empty label is still there");
        }
    }

    @Test
    void anElementUnderAParentThatCannotHoldItsKindIsToldWithItsFileWhateverTheLayerHas() {
        val files = LayeredFixtures.files();
        // a system under a container (issue #87): the layer has patches, and it used to be refused only once the graph was written as JSON for the
        // kernel and read back, with the sentence of the reader and the plateau; without patches it loaded. It is told when the element is added now
        files.put(
            "plateaus/inhouse/odd.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
              plateau: inhouse
              parent: "shop.web"
            content:
              id: "odd"
            """
        );
        val sentence =
            "`plateaus/inhouse/odd.yaml` is not valid: unknown kind `system` under `shop.web` (known: component) at `header.kind`";
        assertEquals(sentence, errorOf(files, "inhouse"), "inhouse has patches");
        assertEquals(sentence, errorOf(files, "marketplace"), "and so does the plateau that overrides it");
        assertNotNull(load(files, "baseline"), "the layers below are not looked at");
        // the same element in a layer that has no patch: the same sentence
        files.remove("plateaus/inhouse/odd.yaml");
        files.put(
            "plateaus/saas/odd.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
              plateau: saas
              parent: "shop.web"
            content:
              id: "odd"
            """
        );
        assertEquals(
            "`plateaus/saas/odd.yaml` is not valid: unknown kind `system` under `shop.web` (known: component) at `header.kind`",
            errorOf(files, "saas"),
            "saas has no patch"
        );
        assertNotNull(load(files, "inhouse"), "a sibling is not concerned");
    }

    @Test
    void theCascadeIsWhatThePlateauTookFromTheOneItIsComparedWith() {
        val files = LayeredFixtures.files();
        // bb removes what inhouse added: the elements inside commerce are in inhouse, and in no baseline
        files.put(
            "plateaus/bb/plateau.yaml",
            "header:\n  kind: \"archicode.morin.io/plateau\"\n  version: \"1\"\ncontent:\n  id: bb\n  override: inhouse\n  patches:\n    - operator: REMOVE\n      target: commerce\n"
        );
        val bb = load(files, "bb");
        val removal = bb.getRemovals().get(bb.getRemovals().size() - 1);
        assertEquals("bb", removal.plateau());
        val inhouse = load(files, "inhouse");
        val baseline = load(files, "baseline");
        assertEquals(
            java.util.List.of("commerce.cart", "commerce.catalog"),
            removal.effects(inhouse).stream().map(Removal.Effect::element).toList(),
            "the elements inside the removed one are inhouse's"
        );
        assertEquals(
            java.util.List.of(),
            removal.effects(baseline),
            "baseline has none of it: no part of the difference"
        );
        // the removal of inhouse itself is, against baseline: the entries taken out of the elements baseline has
        assertEquals(3, Removal.cascade(bb.getRemovals(), baseline).size());
        assertEquals(
            java.util.List.of(),
            Removal.cascade(inhouse.getRemovals(), load(files, "marketplace")),
            "the future has no part of it either"
        );
    }

    @Test
    void anElementDeclaredUnderAParentThatAPatchOfTheLayerRemovesGoesWithIt() {
        val files = LayeredFixtures.files();
        files.put(
            "plateaus/inhouse/queue.yaml",
            """
            header:
              kind: "archicode.morin.io/component"
              version: "1"
              plateau: inhouse
              parent: "shop.cache"
            content:
              id: "queue"
            """
        );
        val inhouse = load(files, "inhouse");
        assertTrue(inhouse.appIndex.searchElement("shop.cache.queue").isEmpty());
        assertTrue(inhouse.appIndex.searchElement("shop.cache").isEmpty());
    }

    @Test
    void anEnvironmentThatUsesAnEnvironmentThatIsNotThereIsToldWithItsLayer() {
        val files = LayeredFixtures.files();
        files.put(
            "manifests/prod.yaml",
            files
                .get("manifests/prod.yaml")
                .replace("  name: \"Production\"\n", "  name: \"Production\"\n  uses: [\"ghost\"]\n")
        );
        assertEquals(
            "in the plateau `baseline`, `prod` uses `ghost`, which does not exist",
            errorOf(files, "baseline")
        );
    }

    @Test
    void theMistakesOfALayerAreToldTogetherAndSorted() {
        val files = LayeredFixtures.files();
        files.put(
            "plateaus/inhouse/extra.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
              plateau: inhouse
            content:
              id: "extra"
              relationships:
                - destination: "zzz"
                - destination: "aaa2"
                - destination: "aaa"
            """
        );
        assertEquals(
            "in the plateau `inhouse`, `extra` has a relationship towards `aaa`, which does not exist\nin the plateau `inhouse`, `extra` has a relationship towards `aaa2`, which does not exist\nin the plateau `inhouse`, `extra` has a relationship towards `zzz`, which does not exist",
            errorOf(files, "inhouse")
        );
    }

    @Test
    void withoutPlateauOptionTheLastPlateauOfALineIsRead() {
        val files = LayeredFixtures.files();
        files.remove("plateaus/saas/platform.yaml");
        assertEquals("marketplace", load(files, null).getPlateau().getId());
    }

    @Test
    void aTreeThatForksNeedsAChoiceAndSettingsCurrentMakesIt() {
        assertEquals(
            "the plateaus of this workspace are not one line (`baseline` is overridden by `inhouse`, `saas`): name the plateau to read with `--plateau`, or with `settings.current`",
            errorOf(LayeredFixtures.files(), null)
        );
        val files = LayeredFixtures.files();
        files.put(LayeredFixtures.WORKSPACE, files.get(LayeredFixtures.WORKSPACE) + "  current: saas\n");
        assertEquals("saas", load(files, null).getPlateau().getId());
        assertEquals("inhouse", load(files, "inhouse").getPlateau().getId(), "--plateau wins over settings.current");
        files.put(
            LayeredFixtures.WORKSPACE,
            files.get(LayeredFixtures.WORKSPACE).replace("current: saas", "current: nope")
        );
        assertEquals(
            "`settings.current` names the plateau `nope`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`, `saas`)",
            errorOf(files, null)
        );
    }

    @Test
    void anExplicitPlateauGetsPastACurrentThatNamesNothingAnyMore() {
        // `settings.current` names a plateau that was renamed: --plateau must not wait for workspace.yaml to be edited first
        val files = LayeredFixtures.files();
        files.put(LayeredFixtures.WORKSPACE, files.get(LayeredFixtures.WORKSPACE) + "  current: renamed\n");
        assertEquals("inhouse", load(files, "inhouse").getPlateau().getId());
        assertEquals("saas", load(files, "saas").getPlateau().getId());
        assertEquals(
            "`settings.current` names the plateau `renamed`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`, `saas`)",
            errorOf(files, null),
            "and it is still refused when nothing else says which plateau to read"
        );
        assertEquals(
            "unknown plateau `nope`: the plateaus of this workspace are `baseline`, `inhouse`, `marketplace` and `saas`",
            errorOf(files, "nope"),
            "a plateau that does not exist is told as it always was"
        );
    }

    /** The fixture with a `replaces` written by inhouse (the cart took the place of the cache) and one by marketplace (the sellers took the console's). */
    private Map<String, String> withReplaces() {
        val files = LayeredFixtures.files();
        files.computeIfPresent("plateaus/inhouse/commerce.yaml", (k, v) ->
            v.replace("name: \"Cart\"", "name: \"Cart\"\n      replaces: [\"shop.cache\"]")
        );
        files.computeIfPresent("plateaus/marketplace/sellers.yaml", (k, v) ->
            v.replace("name: \"Sellers\"", "name: \"Sellers\"\n  replaces: [\"backoffice.console\"]")
        );
        return files;
    }

    private static Change changeOf(Comparison comparison, String reference) {
        return comparison
            .getElements()
            .stream()
            .filter(e -> e.reference().equals(reference))
            .findFirst()
            .orElseThrow()
            .change();
    }

    @Test
    void aComparisonLeavesOutTheReplacesTheBaseAlreadySaysAndKeepsTheOthers() {
        val files = withReplaces();
        val comparer = new PlateauComparer(new ObjectMapper());
        val inhouse = load(files, "inhouse");
        val marketplace = load(files, "marketplace");

        // inhouse wrote that the cart replaces the cache, and marketplace inherits the cart as it was (and tags it): nothing is news.
        // Without the rule the kernel would warn that `shop.cache`, which inhouse removed, is not an element of the base, and the
        // cart would read as moved
        val onTopOfIt = comparer.compare(inhouse, marketplace);
        assertEquals(List.of(), onTopOfIt.getWarnings());
        assertEquals(Change.CHANGED, changeOf(onTopOfIt, "commerce.cart"));
        assertEquals(Change.MOVED, changeOf(onTopOfIt, "sellers"), "what marketplace wrote itself is the news");

        // the root has not got the layer inhouse: what inhouse wrote is the news, and the cart took the place of the cache
        val fromTheRoot = comparer.compare(load(files, "baseline"), marketplace);
        assertEquals(Change.MOVED, changeOf(fromTheRoot, "commerce.cart"));
    }

    @Test
    void theUnionOfAComparisonIsBuiltOnACopyAndTheTargetIsAsItWas() {
        val base = load("baseline");
        val target = load("inhouse");
        val comparison = new PlateauComparer(new ObjectMapper()).compare(base, target);
        val union = workspaceFactory.createUnion(target, base, comparison);

        // inhouse removed `shop.cache`, which is below a system below the root of the layer: the copy goes down to it
        assertTrue(union.appIndex.searchElement("shop.cache").isPresent());
        assertTrue(target.appIndex.searchElement("shop.cache").isEmpty());
        assertFalse(
            ((Parent<?>) target.appIndex.getElementByReference("shop"))
                .getElements()
                .stream()
                .anyMatch(e -> e.getId().equals("cache")),
            "the tree of the target does not hold what only the baseline had"
        );
        assertTrue(
            ((Parent<?>) union.appIndex.getElementByReference("shop"))
                .getElements()
                .stream()
                .anyMatch(e -> e.getId().equals("cache"))
        );
        assertEquals("inhouse", union.getPlateau().getId());
        assertEquals("baseline", union.getBaseline().getId());
    }

    @Test
    void anUnknownPlateauListsThePlateaus() {
        assertEquals(
            "unknown plateau `nope`: the plateaus of this workspace are `baseline`, `inhouse`, `marketplace` and `saas`",
            errorOf(LayeredFixtures.files(), "nope")
        );
    }

    @Test
    void theSameWorkspaceLoadedTwiceGivesTheSameGraph() {
        val first = load("marketplace");
        val second = load("marketplace");
        assertEquals(
            new java.util.TreeMap<>(first.appIndex.elementByReferenceIndex).keySet(),
            new java.util.TreeMap<>(second.appIndex.elementByReferenceIndex).keySet()
        );
        assertEquals(first.getRemovals(), second.getRemovals());
    }

    // ---- the cases both tools run (layer-checks-cases.json, run 0093 of wave 015: issues #90 and #87) ----

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/layer-checks-cases.json");
    private static final ObjectMapper JSON = new ObjectMapper();

    @SneakyThrows
    private static JsonNode caseDocument() {
        return JSON.readTree(Files.readString(CASES));
    }

    static Stream<String> layerCheckCaseIds() {
        val ids = new ArrayList<String>();
        caseDocument()
            .get("cases")
            .forEach(c -> ids.add(c.get("id").asText()));
        return ids.stream();
    }

    private static List<String> textsOf(JsonNode array) {
        val out = new ArrayList<String>();
        array.forEach(a -> out.add(a.asText()));
        return out;
    }

    /** A workspace of the case files: the manifests of {@code manifests/**} and nothing else. */
    @SneakyThrows
    private Path writeCase(Map<String, String> files) {
        val folder = fresh();
        Files.createDirectories(folder);
        Files.writeString(folder.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"manifests/**\"]\n");
        for (val file : files.entrySet()) {
            val target = folder.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, file.getValue());
        }
        return folder.resolve("workspace.yaml");
    }

    private static Map<String, String> filesOf(JsonNode node) {
        val files = new java.util.LinkedHashMap<String, String>();
        node.properties().forEach(e -> files.put(e.getKey(), e.getValue().asText()));
        return files;
    }

    private static Set<String> referencesOf(ElementIndex index) {
        return new TreeSet<>(index.elementByReferenceIndex.keySet());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("layerCheckCaseIds")
    void shouldTellWhatTheCaseSays(String id) {
        JsonNode c = null;
        for (val candidate : caseDocument().get("cases")) {
            if (candidate.get("id").asText().equals(id)) {
                c = candidate;
            }
        }
        val workspace = writeCase(filesOf(c.get("files")));
        val plateau = c.get("plateau").isNull() ? null : c.get("plateau").asText();
        val expect = c.get("cli");
        val label = id + ": " + c.get("what").asText();
        if (expect.has("error")) {
            // the command line stops at the first layer that is wrong, and draws nothing
            val error = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(workspace, null, plateau));
            assertEquals(textsOf(expect.get("error")), error.getMessage().lines().toList(), label);
        } else {
            val loaded = workspaceFactory.create(workspace, null, plateau);
            assertEquals(
                new TreeSet<>(textsOf(expect.get("loaded").get("application"))),
                referencesOf(loaded.appIndex),
                label + ": the application layer"
            );
            assertEquals(
                new TreeSet<>(textsOf(expect.get("loaded").get("technology"))),
                referencesOf(loaded.techIndex),
                label + ": the technology layer"
            );
        }
    }

    // ---- the nesting rule: written once, as data, from the model classes ----

    private static JsonNode holds() {
        return caseDocument().get("nesting").get("holds");
    }

    @Test
    void theClassesSayWhichKindEachParentHolds() {
        val table = holds();
        val instances = Map.<String, Element>of(
            "solution",
            Solution.builder().id("x").build(),
            "system",
            io.morin.archicode.resource.element.application.System.builder().id("x").build(),
            "container",
            Container.builder().id("x").build(),
            "component",
            Component.builder().id("x").build(),
            "person",
            Person.builder().id("x").build(),
            "environment",
            Environment.builder().id("x").build(),
            "node",
            io.morin.archicode.resource.element.technology.Node.builder().id("x").build()
        );
        assertEquals(new TreeSet<>(instances.keySet()), new TreeSet<>(textsOf(JSON.valueToTree(table.fieldNames()))));
        instances.forEach((kind, element) ->
            assertEquals(textsOf(table.get(kind)), Nesting.kindsHeldBy(element), "the kinds a " + kind + " holds")
        );
    }

    private static final List<String> APPLICATION = List.of("solution", "system", "container", "component", "person");
    private static final List<String> TECHNOLOGY = List.of("environment", "node");

    /** Every parent with every kind of the same layer. */
    static Stream<Arguments> pairs() {
        val out = new ArrayList<Arguments>();
        for (val layer : List.of(APPLICATION, TECHNOLOGY)) {
            for (val parent : layer) {
                for (val child : layer) {
                    out.add(Arguments.of(parent, child));
                }
            }
        }
        return out.stream();
    }

    static String manifest(String kind, String id, String parent, String body) {
        return (
            "header:\n  kind: \"archicode.morin.io/" +
            kind +
            "\"\n  version: \"1\"\n" +
            (parent == null ? "" : "  parent: \"" + parent + "\"\n") +
            "content:\n  id: \"" +
            id +
            "\"\n" +
            body
        );
    }

    @ParameterizedTest(name = "a {1} under a {0}")
    @MethodSource("pairs")
    void shouldAcceptTheKindsAParentHoldsAndTellTheOthers(String parentKind, String childKind) {
        val files = new java.util.LinkedHashMap<String, String>();
        files.put("manifests/parent.yaml", manifest(parentKind, "p", null, ""));
        val under = "p";
        files.put("manifests/child.yaml", manifest(childKind, "c", under, ""));
        val workspace = writeCase(files);
        val allowed = textsOf(holds().get(parentKind));
        if (allowed.contains(childKind)) {
            val loaded = workspaceFactory.create(workspace, null, null);
            val index = APPLICATION.contains(childKind) ? loaded.appIndex : loaded.techIndex;
            val element = index.getElementByReference(under + ".c");
            val parent = (Parent<?>) index.getElementByReference(under);
            assertTrue(parent.getElements().contains(element), "the child is in its parent");
        } else {
            val error = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(workspace, null, null));
            assertEquals(
                "`manifests/child.yaml` is not valid: unknown kind `" +
                    childKind +
                    "` under `" +
                    under +
                    "` (known: " +
                    (allowed.isEmpty() ? "none" : String.join(", ", allowed)) +
                    ") at `header.kind`",
                error.getMessage()
            );
        }
    }

    // ---- the kinds a layer holds at its top (issue #106, wave 016 run 0108) ----

    @Test
    void theLayersSayWhichKindsTheyHoldAtTheTop() {
        val top = caseDocument().get("nesting").get("top");
        assertEquals(textsOf(top.get("application")), Nesting.kindsHeldAtTheTop(Application.builder().build()));
        assertEquals(textsOf(top.get("technology")), Nesting.kindsHeldAtTheTop(Technology.builder().build()));
    }

    /** Every kind as a manifest with no {@code header.parent}, in a workspace that has plateaus and in one that has none. */
    static Stream<Arguments> roots() {
        val out = new ArrayList<Arguments>();
        for (val layered : List.of(true, false)) {
            for (val kind : Stream.concat(APPLICATION.stream(), TECHNOLOGY.stream()).toList()) {
                out.add(Arguments.of(layered, kind));
            }
        }
        return out.stream();
    }

    @ParameterizedTest(name = "a {1} with no header.parent, plateaus: {0}")
    @MethodSource("roots")
    void shouldTellTheRootsNoLayerHoldsOnlyInAWorkspaceThatHasPlateaus(boolean layered, String kind) {
        val files = new java.util.LinkedHashMap<String, String>();
        files.put("manifests/r.yaml", manifest(kind, "r", null, ""));
        if (layered) {
            files.put("manifests/p1/plateau.yaml", manifest("plateau", "p1", null, ""));
        }
        val workspace = writeCase(files);
        val layer = APPLICATION.contains(kind) ? "application" : "technology";
        val top = textsOf(caseDocument().get("nesting").get("top").get(layer));
        if (layered && !top.contains(kind)) {
            val error = assertThrows(ArchiCodeException.class, () ->
                workspaceFactory.create(workspace, null, "baseline")
            );
            assertEquals(
                "`manifests/r.yaml` is not valid: unknown kind `" +
                    kind +
                    "` with no `header.parent` (known: " +
                    String.join(", ", top) +
                    ") at `header.kind`",
                error.getMessage()
            );
        } else {
            val loaded = workspaceFactory.create(workspace, null, layered ? "baseline" : null);
            val index = APPLICATION.contains(kind) ? loaded.appIndex : loaded.techIndex;
            assertTrue(index.searchElement("r").isPresent(), "it is indexed and drawn");
        }
    }

    @Test
    @SneakyThrows
    void anIdWithADotInTheWorkspaceFileIsNotAnIndexMistake() {
        // issue #104: the id of a manifest is refused (M81 to M83 of plateau-model-cases.json); the elements that workspace.yaml holds itself are not
        // looked at, and an element declared under one of them must not make the index fail with a null pointer
        val folder = fresh();
        Files.createDirectories(folder.resolve("manifests"));
        Files.writeString(
            folder.resolve("workspace.yaml"),
            "settings:\n  manifests:\n    paths: [\"manifests\"]\napplication:\n  elements:\n    - kind: system\n      id: \"a.b\"\n"
        );
        Files.writeString(folder.resolve("manifests/c.yaml"), manifest("container", "c", "a.b", ""));
        val loaded = workspaceFactory.create(folder.resolve("workspace.yaml"), null, null);
        assertTrue(loaded.appIndex.searchElement("a.b.c").isPresent());
    }
}

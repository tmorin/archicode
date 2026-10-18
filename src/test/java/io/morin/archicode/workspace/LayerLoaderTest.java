package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.LayeredFixtures;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

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
    void aViewAndAStoryPlacedInALayerAreCheckedAfterThatLayer() {
        val files = LayeredFixtures.files();
        files.put(
            "plateaus/inhouse/view.cart.yaml",
            """
            header:
              kind: "archicode.morin.io/view"
              version: "1"
              plateau: inhouse
            content:
              id: "cart_overview"
              viewpoint: "overview"
              properties:
                element: "commerce.cart"
            """
        );
        assertNotNull(load(files, "inhouse"), "the element is there once inhouse is built");
        assertEquals(1, load(files, "marketplace").getViews().size());
        // a view that names an element the graph does not have once inhouse is built is told with inhouse
        files.put(
            "plateaus/inhouse/view.cart.yaml",
            files.get("plateaus/inhouse/view.cart.yaml").replace("commerce.cart", "commerce.cartt")
        );
        assertEquals(
            "in the plateau `inhouse`, the view `cart_overview` (`plateaus/inhouse/view.cart.yaml`) names `commerce.cartt`, which does not exist",
            errorOf(files, "inhouse")
        );
        assertNotNull(load(files, "baseline"), "a view of a layer above is not looked at");
        files.remove("plateaus/inhouse/view.cart.yaml");
        files.put(
            "plateaus/marketplace/story.tour.yaml",
            """
            header:
              kind: "archicode.morin.io/story"
              version: "1"
              plateau: marketplace
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
            "in the plateau `marketplace`, the story `tour` (`plateaus/marketplace/story.tour.yaml`) names `ghost`, which does not exist",
            errorOf(files, "marketplace")
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
    void aGraphTheModelCannotHoldOnceItIsWrittenIsToldWithItsLayer() {
        val files = LayeredFixtures.files();
        // a system under a container: nothing reads it without patches, and the patches write the graph as JSON
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
        val message = errorOf(files, "inhouse");
        assertTrue(
            message.startsWith(
                "in the plateau `inhouse`, the elements cannot be read once the patches are applied: unknown kind `"
            ),
            message
        );
        assertFalse(message.contains("\n"));
        assertFalse(message.contains("Exception"));
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
              kind: "archicode.morin.io/container"
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
}

package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * The Java entry of the kernel's {@code compare} ({@link PlateauComparer}, {@link Comparison}) and the views of a
 * comparison ({@link KernelViewpointFactory} given a {@link Comparison}): every item and link tells what changed.
 *
 * <p>The pair is invented. {@code sys} holds {@code a}, {@code b} and, in the base only, {@code old}, and in the target
 * only, {@code fresh}; {@code ext} (with {@code ext.x}) and {@code other.d} are new; {@code a} gained a link to
 * {@code ext.x} and lost one to {@code other.c}; {@code old} had a link to {@code sys.b}.
 */
@QuarkusTest
class PlateauComparerTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static Relationship rel(String destination, String label) {
        return Relationship.builder().destination(destination).label(label).build();
    }

    private static Container con(String id, Relationship... relationships) {
        return Container.builder().id(id).relationships(Set.of(relationships)).build();
    }

    private static Workspace raw(System... systems) {
        return Workspace.builder()
            .application(Application.builder().elements(Set.of(systems)).build())
            .build();
    }

    private static System sys(String id, Container... containers) {
        return System.builder().id(id).elements(Set.of(containers)).build();
    }

    private Workspace base() {
        return raw(
            sys(
                "sys",
                con("a", rel("sys.b", "feeds"), rel("other.c", "stale")),
                con("b"),
                con("old", rel("sys.b", "legacy"))
            ),
            sys("other", con("c"))
        );
    }

    private Workspace target() {
        return raw(
            sys(
                "sys",
                con("a", rel("sys.b", "feeds"), rel("ext.x", "calls")),
                con("b"),
                con("fresh", rel("ext.x", "pushes"))
            ),
            sys("ext", con("x")),
            sys("other", con("c"), con("d", rel("ext.x", "emits")))
        );
    }

    /** What the CLI will load for a comparison: everything the target has, and the element only the base has. */
    private Workspace union() {
        return raw(
            sys(
                "sys",
                con("a", rel("sys.b", "feeds"), rel("ext.x", "calls")),
                con("b"),
                con("fresh", rel("ext.x", "pushes")),
                con("old", rel("sys.b", "legacy"))
            ),
            sys("ext", con("x")),
            sys("other", con("c"), con("d", rel("ext.x", "emits")))
        );
    }

    private Comparison compare() {
        return new PlateauComparer(objectMapper).compare(
            workspaceFactory.create(base(), Map.of()),
            workspaceFactory.create(target(), Map.of())
        );
    }

    private Viewpoint view(Comparison comparison, boolean onlyChanges, String focal) {
        val view = ResourceFixtures.createDeepViewBuilder("view", focal).layer(View.Layer.APPLICATION).build();
        return new KernelViewpointFactory("deep", objectMapper, comparison, onlyChanges).create(
            workspaceFactory.create(union(), Map.of()),
            view
        );
    }

    private static Map<String, Item> itemsOf(Viewpoint viewpoint) {
        return viewpoint
            .getItems()
            .stream()
            .flatMap(Item::stream)
            .collect(Collectors.toMap(Item::getReference, Function.identity()));
    }

    private static Link link(Viewpoint viewpoint, String from, String to) {
        return viewpoint
            .getLinks()
            .stream()
            .filter(l -> l.getFrom().getReference().equals(from) && l.getTo().getReference().equals(to))
            .findFirst()
            .orElseThrow(() -> new AssertionError("no link " + from + " -> " + to));
    }

    // ---- the entry ----

    @Test
    void shouldListTheNewChangedAndRemovedThingsOfTwoPlateaus() {
        val comparison = compare();

        Assertions.assertEquals(new Comparison.ElementCounts(4, 1, 1, 0), comparison.getCounts().elements());
        Assertions.assertEquals(new Comparison.RelationshipCounts(3, 0, 2), comparison.getCounts().relationships());
        val changeOf = comparison
            .getElements()
            .stream()
            .collect(Collectors.toMap(Comparison.ElementChange::reference, Comparison.ElementChange::change));
        Assertions.assertEquals(
            Map.ofEntries(
                Map.entry("sys", Change.NONE),
                Map.entry("sys.a", Change.CHANGED),
                Map.entry("sys.b", Change.NONE),
                Map.entry("sys.old", Change.REMOVED),
                Map.entry("sys.fresh", Change.NEW),
                Map.entry("ext", Change.NEW),
                Map.entry("ext.x", Change.NEW),
                Map.entry("other", Change.NONE),
                Map.entry("other.c", Change.NONE),
                Map.entry("other.d", Change.NEW)
            ),
            changeOf,
            "the union: a container is not changed because of what is in it, and the removed element is there"
        );
        val a = comparison
            .getElements()
            .stream()
            .filter(e -> "sys.a".equals(e.reference()))
            .findFirst()
            .orElseThrow();
        Assertions.assertEquals(List.of("relationships-added", "relationships-removed"), a.natures());
        Assertions.assertFalse(a.wordingOnly());
    }

    @Test
    void shouldKeepTheRemovedRelationshipsAndGiveATableSortedByLayerAndReference() {
        val comparison = compare();

        val removed = comparison
            .getRelationships()
            .stream()
            .filter(r -> r.change() == Change.REMOVED)
            .map(r -> r.from() + " -> " + r.destination() + " " + r.label())
            .sorted()
            .toList();
        Assertions.assertEquals(List.of("sys.a -> other.c stale", "sys.old -> sys.b legacy"), removed);
        val rows = comparison
            .getChanges()
            .stream()
            .map(r -> r.thing() + ":" + r.reference())
            .toList();
        Assertions.assertEquals(
            List.of(
                "element:ext",
                "element:ext.x",
                "element:other.d",
                "element:sys.a",
                "element:sys.fresh",
                "element:sys.old",
                "relationship:other.d",
                "relationship:sys.a",
                "relationship:sys.a",
                "relationship:sys.fresh",
                "relationship:sys.old"
            ),
            rows
        );
        val row = comparison
            .getChanges()
            .stream()
            .filter(r -> "sys.a".equals(r.reference()) && "element".equals(r.thing()))
            .findFirst()
            .orElseThrow();
        Assertions.assertEquals(Change.CHANGED, row.change());
        Assertions.assertEquals("container", row.kind());
    }

    @Test
    void shouldGiveTheSameAnswerTwiceAndNothingForAPlateauComparedWithItself() {
        Assertions.assertEquals(compare(), compare());

        val same = workspaceFactory.create(target(), Map.of());
        val nothing = new PlateauComparer(objectMapper).compare(same, same);
        Assertions.assertEquals(new Comparison.ElementCounts(0, 0, 0, 0), nothing.getCounts().elements());
        Assertions.assertEquals(new Comparison.RelationshipCounts(0, 0, 0), nothing.getCounts().relationships());
        Assertions.assertTrue(nothing.getChanges().isEmpty());
        Assertions.assertTrue(
            nothing
                .getElements()
                .stream()
                .allMatch(e -> e.change() == Change.NONE)
        );
    }

    @Test
    void shouldCompareTheTechnologyLayerToo() {
        val environment = (Function<Set<String>, Workspace>) applications ->
            Workspace.builder()
                .application(
                    Application.builder()
                        .elements(Set.of(sys("shop", con("api"), con("db"))))
                        .build()
                )
                .technology(
                    Technology.builder()
                        .elements(
                            Set.of(
                                Environment.builder()
                                    .id("dev")
                                    .elements(Set.of(Node.builder().id("host").applications(applications).build()))
                                    .build()
                            )
                        )
                        .build()
                )
                .build();

        val comparison = new PlateauComparer(objectMapper).compare(
            workspaceFactory.create(environment.apply(Set.of("shop.api")), Map.of()),
            workspaceFactory.create(environment.apply(Set.of("shop.api", "shop.db")), Map.of())
        );

        val host = comparison
            .getChanges()
            .stream()
            .filter(r -> "technology".equals(r.layer()) && "dev.host".equals(r.reference()))
            .findFirst()
            .orElseThrow();
        Assertions.assertEquals(Change.CHANGED, host.change());
        Assertions.assertEquals(List.of("deployment"), host.natures());
        Assertions.assertEquals(1, host.after().get("applications").size() - host.before().get("applications").size());
        Assertions.assertEquals(1, comparison.getChanges().size(), "the application layer did not change");
    }

    @Test
    void shouldReportWhatTheKernelRefusesAndTheVersionItDoesNotKnow() {
        val refused = Assertions.assertThrows(ArchiCodeException.class, () ->
            Comparison.of(objectMapper.readTree("{\"error\":\"dangling reference: x in the base plateau\"}"))
        );
        Assertions.assertTrue(refused.getMessage().contains("dangling reference: x"));
        val other = Assertions.assertThrows(ArchiCodeException.class, () ->
            Comparison.of(objectMapper.readTree("{\"version\":" + (ViewpointKernel.CONTRACT_VERSION + 1) + "}"))
        );
        Assertions.assertTrue(other.getMessage().contains("speaks version"));
    }

    @Test
    @SneakyThrows
    void shouldSpeakTheContractVersionOfTheKernel() {
        val answer = objectMapper.readTree(
            ViewpointKernel.getInstance().compare(
                "{\"base\":{\"application\":[]},\"target\":{\"application\":[]},\"on_one_chain\":true}"
            )
        );
        Assertions.assertEquals(ViewpointKernel.CONTRACT_VERSION, answer.get("version").asInt());
        Assertions.assertEquals(5, ViewpointKernel.CONTRACT_VERSION);
    }

    // ---- the views ----

    @Test
    void shouldTellEveryItemAndLinkOfAViewWhatChanged() {
        val viewpoint = view(compare(), false, "sys");

        val items = itemsOf(viewpoint);
        Assertions.assertEquals(Change.CHANGED, items.get("sys.a").getChange());
        Assertions.assertEquals(Change.NEW, items.get("sys.fresh").getChange());
        Assertions.assertEquals(Change.REMOVED, items.get("sys.old").getChange());
        Assertions.assertEquals(Change.NONE, items.get("sys.b").getChange());
        Assertions.assertEquals(Change.NEW, items.get("ext").getChange());
        Assertions.assertEquals(
            List.of("relationships-added", "relationships-removed"),
            items.get("sys.a").getNatures()
        );
        Assertions.assertTrue(items.values().stream().noneMatch(Item::isContext));

        Assertions.assertEquals(Change.NEW, link(viewpoint, "sys.a", "ext.x").getChange());
        Assertions.assertEquals(Change.NEW, link(viewpoint, "sys.fresh", "ext.x").getChange());
        Assertions.assertEquals(Change.NONE, link(viewpoint, "sys.a", "sys.b").getChange());
        Assertions.assertEquals(Change.REMOVED, link(viewpoint, "sys.old", "sys.b").getChange());
        val removed = link(viewpoint, "sys.a", "other.c");
        Assertions.assertEquals(Change.REMOVED, removed.getChange());
        Assertions.assertEquals("stale", removed.getLabel());
        Assertions.assertEquals(
            Set.of("other.c"),
            removed.getRelationships().stream().map(Relationship::getDestination).collect(Collectors.toSet()),
            "the relationship only the base had is there to draw, though the target's element does not declare it"
        );
    }

    @Test
    void shouldAddTheComputedStateLastToTheStereotypesAndMarkTheContainersThatContainChanges() {
        val items = itemsOf(view(compare(), false, "sys"));

        Assertions.assertEquals(List.of("changed"), items.get("sys.a").getStereotypes());
        Assertions.assertEquals(List.of("new"), items.get("sys.fresh").getStereotypes());
        Assertions.assertEquals(List.of("removed"), items.get("sys.old").getStereotypes());
        Assertions.assertEquals(List.of(), items.get("sys.b").getStereotypes());
        Assertions.assertEquals(List.of("contains-changes"), items.get("sys").getStereotypes());
        Assertions.assertEquals(Change.NONE, items.get("sys").getChange(), "not changed because of what is inside it");
        Assertions.assertEquals(List.of("contains-changes"), items.get("other").getStereotypes());
    }

    @Test
    void shouldKeepOnlyTheChangesAndTheirContextWhenAskedTo() {
        val viewpoint = view(compare(), true, "sys");

        val items = itemsOf(viewpoint);
        Assertions.assertFalse(items.containsKey("other.d"), "not part of the deep view of sys");
        Assertions.assertTrue(items.get("sys").isContext(), "encloses changes");
        Assertions.assertTrue(items.get("sys.b").isContext(), "the end of the removed link");
        Assertions.assertTrue(items.get("other").isContext());
        Assertions.assertTrue(items.get("other.c").isContext(), "the end of the removed link");
        for (val changed : List.of("sys.a", "sys.fresh", "sys.old", "ext", "ext.x")) {
            Assertions.assertFalse(items.get(changed).isContext(), changed);
        }
        Assertions.assertEquals(
            4,
            viewpoint.getLinks().size(),
            "the unchanged link between sys.a and sys.b is left out"
        );
        Assertions.assertTrue(
            viewpoint
                .getLinks()
                .stream()
                .allMatch(l -> l.getChange().isChange())
        );
    }

    @Test
    void shouldDrawAViewWithoutComparisonAsItAlwaysWasDrawn() {
        val view = ResourceFixtures.createDeepViewBuilder("view", "sys").layer(View.Layer.APPLICATION).build();
        val viewpoint = new KernelViewpointFactory("deep", objectMapper).create(
            workspaceFactory.create(union(), Map.of()),
            view
        );

        Assertions.assertTrue(
            itemsOf(viewpoint)
                .values()
                .stream()
                .allMatch(
                    i ->
                        i.getChange() == Change.NONE &&
                        !i.isContext() &&
                        i.getNatures().isEmpty() &&
                        i.getStereotypes().isEmpty()
                )
        );
        Assertions.assertTrue(
            viewpoint
                .getLinks()
                .stream()
                .allMatch(l -> l.getChange() == Change.NONE)
        );
        Assertions.assertEquals(
            1,
            viewpoint
                .getLinks()
                .stream()
                .filter(l -> "ext.x".equals(l.getTo().getReference()))
                .filter(l -> "sys.a".equals(l.getFrom().getReference()))
                .count()
        );
    }

    // ---- replaces: an element of the more recent plateau says what it is the new place of ----

    private static final Path REPLACES = Path.of(
        "src/test/resources/plateau-comparison/replaces/.archicode.yaml"
    ).toAbsolutePath();

    private Comparison compareReplaces() {
        return new PlateauComparer(objectMapper).compare(
            workspaceFactory.create(REPLACES, null, "before"),
            workspaceFactory.create(REPLACES, null, "after")
        );
    }

    private static Comparison.ElementChange element(Comparison comparison, String reference) {
        return comparison
            .getElements()
            .stream()
            .filter(e -> e.reference().equals(reference))
            .findFirst()
            .orElseThrow(() -> new AssertionError("no element " + reference));
    }

    @Test
    void shouldReadReplacesFromTheManifestsAndReportMovedSplitAndMergedElements() {
        val comparison = compareReplaces();

        Assertions.assertEquals(Change.MOVED, element(comparison, "stock.till").change());
        Assertions.assertEquals(List.of("shop.till"), element(comparison, "stock.till").replaces());
        Assertions.assertEquals(Change.SPLIT, element(comparison, "shop.report-a").change());
        Assertions.assertEquals(Change.SPLIT, element(comparison, "shop.report-b").change());
        Assertions.assertEquals(List.of("shop.report"), element(comparison, "shop.report-b").replaces());
        Assertions.assertEquals(Change.MERGED, element(comparison, "stock.place").change());
        Assertions.assertEquals(List.of("stock.bin", "stock.shelf"), element(comparison, "stock.place").replaces());
        Assertions.assertEquals(1, new Comparison.ElementCounts(0, 0, 0, 0, 1, 2, 1).moved());
        Assertions.assertEquals(1, comparison.getCounts().elements().moved());
        Assertions.assertEquals(2, comparison.getCounts().elements().split());
        Assertions.assertEquals(1, comparison.getCounts().elements().merged());
        val references = comparison.getElements().stream().map(Comparison.ElementChange::reference).toList();
        for (val replaced : List.of("shop.till", "stock.bin", "stock.shelf")) {
            Assertions.assertFalse(references.contains(replaced), replaced + " is replaced: it is not removed");
        }
        // shop.report is replaced too, and it held a component that was not: the union keeps it as the place that component was removed from
        Assertions.assertEquals(
            List.of("shop.report-a", "shop.report-b"),
            element(comparison, "shop.report").replacedBy()
        );
        Assertions.assertEquals(Change.REMOVED, element(comparison, "shop.report").change());
        Assertions.assertTrue(
            comparison
                .getChanges()
                .stream()
                .noneMatch(r -> "shop.report".equals(r.reference())),
            "and it has no row"
        );
        Assertions.assertEquals(2, comparison.getCounts().elements().removed(), "the chart and the mailer");
        Assertions.assertEquals(
            Change.REMOVED,
            element(comparison, "shop.report.chart").change(),
            "what a replaced element held is removed unless it is replaced too"
        );
        val row = comparison
            .getChanges()
            .stream()
            .filter(r -> "element".equals(r.thing()) && "stock.place".equals(r.reference()))
            .findFirst()
            .orElseThrow();
        Assertions.assertEquals(Change.MERGED, row.change());
        Assertions.assertEquals(List.of("stock.bin", "stock.shelf"), row.replaces());
    }

    @Test
    void shouldFollowTheRelationshipsAndTheDeploymentOfAReplacedElement() {
        val comparison = compareReplaces();

        // web -> shop.till became web -> stock.till, till -> bin became till -> place: neither is a change
        Assertions.assertTrue(
            comparison
                .getRelationships()
                .stream()
                .allMatch(r -> r.change() == Change.NONE),
            comparison.getRelationships().toString()
        );
        Assertions.assertEquals(Change.NONE, element(comparison, "shop.web").change());
        Assertions.assertTrue(
            comparison
                .getChanges()
                .stream()
                .noneMatch(r -> "relationship".equals(r.thing()) || "prod.cluster".equals(r.reference())),
            "the node that hosted the till hosts the one that replaced it"
        );
    }

    @Test
    void shouldWarnAboutAReplacedReferenceUnknownInTheBaselineAndListCandidatesWithoutApplyingThem() {
        val comparison = compareReplaces();

        Assertions.assertEquals(1, comparison.getWarnings().size());
        Assertions.assertTrue(
            comparison.getWarnings().get(0).contains("shop.nowhere"),
            comparison.getWarnings().get(0)
        );
        Assertions.assertEquals(
            List.of(
                new Comparison.Candidate("application", "shop.mailer", "shop.postman", List.of("description", "parent"))
            ),
            comparison.getCandidates()
        );
        Assertions.assertEquals(Change.REMOVED, element(comparison, "shop.mailer").change(), "listed, not applied");
        Assertions.assertEquals(Change.NEW, element(comparison, "shop.postman").change());
    }

    @Test
    void shouldGiveTheSameAnswerTwiceWithReplaces() {
        Assertions.assertEquals(compareReplaces(), compareReplaces());
    }

    @Test
    void shouldCarryReplacesFromTheElementModelToTheKernel() {
        val before = raw(sys("shop", con("till")), sys("stock"));
        val after = raw(
            sys("shop"),
            System.builder()
                .id("stock")
                .elements(Set.of(Container.builder().id("till").replaces(Set.of("shop.till")).build()))
                .build()
        );
        val comparison = new PlateauComparer(objectMapper).compare(
            workspaceFactory.create(before, Map.of()),
            workspaceFactory.create(after, Map.of())
        );
        Assertions.assertEquals(Change.MOVED, element(comparison, "stock.till").change());
        Assertions.assertEquals(Change.NONE, element(comparison, "shop").change());
        Assertions.assertEquals(0, comparison.getCounts().elements().removed());
        Assertions.assertTrue(comparison.getWarnings().isEmpty());
        Assertions.assertTrue(comparison.getCandidates().isEmpty());
    }

    @Test
    void shouldDrawAnElementThatReplacesAnotherWithItsWordAsItsState() {
        val base = workspaceFactory.create(REPLACES, null, "before");
        val target = workspaceFactory.create(REPLACES, null, "after");
        val comparison = new PlateauComparer(objectMapper).compare(base, target);
        val union = workspaceFactory.createUnion(target, base, comparison);
        val view = ResourceFixtures.createDeepViewBuilder("view", "stock").layer(View.Layer.APPLICATION).build();

        val viewpoint = new KernelViewpointFactory("deep", objectMapper, comparison, false).create(union, view);

        val till = itemsOf(viewpoint).get("stock.till");
        Assertions.assertNotNull(till);
        Assertions.assertEquals(Change.MOVED, till.getChange());
        Assertions.assertEquals("moved", till.getStereotypes().getLast());
        Assertions.assertEquals(Change.MERGED, itemsOf(viewpoint).get("stock.place").getChange());
    }

    // ---- the state of a container is said by the kernel, on the union and on the view (issue #96) ----

    private static io.morin.archicode.resource.element.application.Component cmp(
        String id,
        Relationship... relationships
    ) {
        return io.morin.archicode.resource.element.application.Component.builder()
            .id(id)
            .relationships(Set.of(relationships))
            .build();
    }

    private static Container box(String id, io.morin.archicode.resource.element.application.Component... components) {
        return Container.builder()
            .id(id)
            .elements(Set.<io.morin.archicode.resource.element.application.ContainerElement>of(components))
            .build();
    }

    /** Three levels: {@code shop.web} holds a component that is new and one that did not change, {@code shop.db} holds none that changed. */
    private Comparison threeLevels() {
        val feeds = rel("shop.db.store", "feeds");
        val base = raw(
            sys("shop", box("web", cmp("cart", feeds), cmp("old", feeds)), box("db", cmp("store"))),
            sys("quiet", box("q", cmp("a", rel("quiet.q.b", "calls")), cmp("b")))
        );
        val target = raw(
            sys("shop", box("web", cmp("cart", feeds), cmp("fresh", feeds)), box("db", cmp("store"))),
            sys("quiet", box("q", cmp("a", rel("quiet.q.b", "calls")), cmp("b")))
        );
        return new PlateauComparer(objectMapper).compare(
            workspaceFactory.create(base, Map.of()),
            workspaceFactory.create(target, Map.of())
        );
    }

    @Test
    void shouldReadTheStateOfAContainerFromTheUnionAndFindItAgainOnTheItemsOfTheView() {
        val comparison = threeLevels();
        val says = comparison
            .getElements()
            .stream()
            .filter(e -> "application".equals(e.layer()))
            .collect(Collectors.toMap(Comparison.ElementChange::reference, Function.identity()));
        // what the union says: the boxes above a change, whatever their depth, and no other
        Assertions.assertTrue(says.get("shop").containsChanges());
        Assertions.assertTrue(says.get("shop.web").containsChanges());
        for (val reference : List.of(
            "shop.web.fresh",
            "shop.web.old",
            "shop.web.cart",
            "shop.db",
            "shop.db.store",
            "quiet",
            "quiet.q"
        )) {
            Assertions.assertFalse(says.get(reference).containsChanges(), reference);
        }
        Assertions.assertEquals(Change.NEW, says.get("shop.web.fresh").change());
        Assertions.assertEquals(Change.REMOVED, says.get("shop.web.old").change());

        // and the view draws the same data through `compute`, which works the state out on its own: every item says what the union says
        val union = raw(
            sys(
                "shop",
                box(
                    "web",
                    cmp("cart", rel("shop.db.store", "feeds")),
                    cmp("fresh", rel("shop.db.store", "feeds")),
                    cmp("old", rel("shop.db.store", "feeds"))
                ),
                box("db", cmp("store"))
            ),
            sys("quiet", box("q", cmp("a", rel("quiet.q.b", "calls")), cmp("b")))
        );
        var compared = 0;
        for (val focal : List.of("shop", "quiet")) {
            val view = ResourceFixtures.createDeepViewBuilder("view", focal).layer(View.Layer.APPLICATION).build();
            val drawn = new KernelViewpointFactory("deep", objectMapper, comparison, false).create(
                workspaceFactory.create(union, Map.of()),
                view
            );
            for (val item : itemsOf(drawn).values()) {
                val element = says.get(item.getReference());
                Assertions.assertNotNull(element, item.getReference());
                Assertions.assertEquals(
                    element.containsChanges(),
                    item.isContainsChanges(),
                    item.getReference() + ": the item says what the union says"
                );
                compared++;
            }
        }
        Assertions.assertTrue(compared >= 6, "the check looked at the boxes: " + compared);
    }
}

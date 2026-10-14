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
            .filter(e -> e.reference().equals("sys.a"))
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
            .filter(r -> r.reference().equals("sys.a") && r.thing().equals("element"))
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
            .filter(r -> r.layer().equals("technology") && r.reference().equals("dev.host"))
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
            ViewpointKernel.getInstance().compare("{\"base\":{\"application\":[]},\"target\":{\"application\":[]}}")
        );
        Assertions.assertEquals(ViewpointKernel.CONTRACT_VERSION, answer.get("version").asInt());
        Assertions.assertEquals(3, ViewpointKernel.CONTRACT_VERSION);
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
                .filter(l -> l.getTo().getReference().equals("ext.x"))
                .filter(l -> l.getFrom().getReference().equals("sys.a"))
                .count()
        );
    }
}

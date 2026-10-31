package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.plateau.Patch;
import io.morin.archicode.resource.plateau.Plateau;
import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.workspace.Fold.Composition;
import io.morin.archicode.workspace.Fold.Entry;
import io.morin.archicode.workspace.Fold.ReplacesChange;
import io.morin.archicode.workspace.Fold.StepNaming;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * Which plateau can be folded into the plateau above it, and what the plan says (wave 028, run 0207, issue #65, decisions
 * DEC-1 and DEC-6). {@link Fold} is called with hand-made data, without a command line, a workspace folder or Quarkus; the
 * cases that are whole workspaces are {@code fold-cases.json}, run through the service and the command.
 */
class FoldTest {

    private static final String ROOT_SENTENCE =
        "the plateau `baseline` is the root of the plateaus: nothing is below it to fold it into";

    private static Patch remove(String target) {
        return Patch.builder().operator(Patch.Operator.REMOVE).target(target).build();
    }

    private static List<Patch> patches(int count) {
        val out = new ArrayList<Patch>();
        for (var i = 0; i < count; i++) {
            out.add(remove("shop.x" + i));
        }
        return out;
    }

    private static PlateauTree.Declared declared(String id, String override, int patchCount) {
        return declared(id, override, patchCount, null, null);
    }

    private static PlateauTree.Declared declared(
        String id,
        String override,
        int patchCount,
        String name,
        String horizon
    ) {
        return new PlateauTree.Declared(
            Plateau.builder()
                .id(id)
                .name(name)
                .horizon(horizon)
                .override(override)
                .patches(patches(patchCount))
                .build(),
            id + "/plateau.yaml"
        );
    }

    /** baseline, then a (2 patches), then b (3 patches), and c beside a; a is named by two files, b by one. */
    private static PlateauTree tree() {
        return PlateauTree.of(
            List.of(declared("a", null, 2), declared("b", "a", 3), declared("c", null, 1)),
            Map.of("a", List.of("a/y.yaml", "a/x.yaml"), "b", List.of("b/z.yaml")),
            "test"
        );
    }

    /** a is overridden by b and by b2, which do not stack. */
    private static PlateauTree fork() {
        return PlateauTree.of(
            List.of(declared("a", null, 2), declared("b", "a", 3), declared("b2", "a", 1)),
            Map.of("a", List.of("a/x.yaml")),
            "test"
        );
    }

    private static Composition composition() {
        return new Composition(
            Set.of("shop.a1", "shop.a2"),
            Map.of("shop.a1", List.of("shop.old"), "shop.a2", List.of()),
            List.of(
                new Entry("b/z.yaml", "shop.b1", List.of("shop.a1")),
                new Entry("b/other.yaml", "shop.b2", List.of("shop.legacy"))
            )
        );
    }

    private static String refusal(
        String id,
        PlateauTree tree,
        String current,
        List<StepNaming> steps,
        AtomicInteger asked
    ) {
        val e = assertThrows(ArchiCodeException.class, () ->
            Fold.plan(id, tree, current, steps, () -> {
                asked.incrementAndGet();
                return composition();
            })
        );
        assertEquals(0, asked.get(), "the composition is asked for only when no refusal applies");
        return e.getMessage();
    }

    private static String refusal(String id, PlateauTree tree, String current, List<StepNaming> steps) {
        return refusal(id, tree, current, steps, new AtomicInteger());
    }

    @Test
    void shouldRefuseAnUnknownPlateauWithTheSentenceOfTheTree() {
        val expected = assertThrows(ArchiCodeException.class, () -> tree().node("zz")).getMessage();

        assertEquals(expected, refusal("zz", tree(), null, List.of()));
    }

    @Test
    void shouldRefuseTheRoot() {
        assertEquals(ROOT_SENTENCE, refusal("baseline", tree(), null, List.of()));
    }

    @Test
    void shouldRefuseALeaf() {
        assertEquals(
            "the plateau `b` is not overridden by any plateau, so there is no plateau above it to fold it into: " +
                "to remove it, use Delete in the editor",
            refusal("b", tree(), null, List.of())
        );
    }

    @Test
    void shouldRefuseAPlateauThatSeveralPlateausOverride() {
        assertEquals(
            "the plateau `a` is overridden by `b` and `b2`, which do not stack: folding it into one would change " +
                "the other. Keep it",
            refusal("a", fork(), null, List.of())
        );
    }

    @Test
    void shouldRefuseAPlateauThatSettingsCurrentNames() {
        assertEquals(
            "`settings.current` names the plateau `a`: write another plateau in `.archicode.yaml` first " +
                "(`b` is the one above it)",
            refusal("a", tree(), "a", List.of())
        );
    }

    @Test
    void shouldAcceptSettingsCurrentThatNamesAnotherPlateau() {
        assertEquals("b", Fold.plan("a", tree(), "c", List.of(), FoldTest::composition).into());
    }

    @Test
    void shouldRefuseAPlateauThatStepsName() {
        val steps = List.of(
            new StepNaming("seller", "shared/seller.yaml", 3, "b", "a"),
            new StepNaming("tour", "shared/tour.yaml", 5, null, "a"),
            new StepNaming("tour", "shared/tour.yaml", 3, "a", null),
            new StepNaming("tour", "shared/tour.yaml", 4, "a", "c"),
            new StepNaming("tour", "shared/tour.yaml", 6, "c", "b")
        );

        assertEquals(
            "the plateau `a` is named by the story `seller` (`shared/seller.yaml`) step 3 (`against`), and the story " +
                "`tour` (`shared/tour.yaml`) step 3 (`at`), step 4 (`at`) and step 5 (`against`): change those steps " +
                "first, none is rewritten for you",
            refusal("a", tree(), null, steps)
        );
    }

    @Test
    void shouldIgnoreAStepThatNamesAnotherPlateau() {
        val steps = List.of(new StepNaming("tour", "shared/tour.yaml", 1, "b", "c"));

        assertEquals("b", Fold.plan("a", tree(), null, steps, FoldTest::composition).into());
    }

    @Test
    void shouldTellTheFirstRefusalOnly() {
        val steps = List.of(new StepNaming("tour", "shared/tour.yaml", 1, "a", null));

        assertEquals(ROOT_SENTENCE, refusal("baseline", tree(), "baseline", steps));
        assertEquals(
            "the plateau `b` is not overridden by any plateau, so there is no plateau above it to fold it into: " +
                "to remove it, use Delete in the editor",
            refusal("b", tree(), "b", steps)
        );
        assertEquals(
            "the plateau `a` is overridden by `b` and `b2`, which do not stack: folding it into one would change " +
                "the other. Keep it",
            refusal("a", fork(), "a", steps)
        );
        assertEquals(
            "`settings.current` names the plateau `a`: write another plateau in `.archicode.yaml` first " +
                "(`b` is the one above it)",
            refusal("a", tree(), "a", steps)
        );
    }

    @Test
    void shouldPlanTheFoldOfAPlateauIntoTheOneAbove() {
        val asked = new AtomicInteger();

        val plan = Fold.plan("a", tree(), null, List.of(), () -> {
            asked.incrementAndGet();
            return composition();
        });

        assertEquals(1, asked.get());
        assertEquals("a", plan.folded());
        assertEquals("b", plan.into());
        assertEquals("baseline", plan.newParent());
        assertEquals(List.of("a/x.yaml", "a/y.yaml", "b/plateau.yaml", "b/z.yaml"), plan.rewritten());
        assertEquals(List.of("a/plateau.yaml"), plan.deleted());
        assertEquals(2, plan.foldedPatches());
        assertEquals(3, plan.intoPatches());
        assertEquals(
            List.of(new ReplacesChange("b/z.yaml", "shop.b1", List.of("shop.a1"), List.of("shop.old"))),
            plan.replaces()
        );
        assertEquals(List.of("baseline", "c"), plan.stay());
    }

    @Test
    void shouldCarryWhatTheWriterNeeds() {
        val named = PlateauTree.of(
            List.of(declared("a", null, 2, "Build services", "2026-Q4"), declared("b", "a", 3)),
            Map.of("a", List.of("a/y.yaml", "a/x.yaml")),
            "test"
        );

        val plan = Fold.plan("a", named, null, List.of(), () -> new Composition(Set.of(), Map.of(), List.of()));

        assertEquals(List.of("a/x.yaml", "a/y.yaml"), plan.headers());
        assertEquals("b/plateau.yaml", plan.intoManifest());
        assertEquals("Build services", plan.foldedName());
        assertEquals("2026-Q4", plan.foldedHorizon());
        assertEquals(List.of("a/plateau.yaml"), plan.deleted());
    }

    @Test
    void shouldHaveNoNameAndNoHorizonWhenNoManifestDeclaresThePlateau() {
        val headerOnly = PlateauTree.of(List.of(declared("b", "a", 3)), Map.of("a", List.of("a/x.yaml")), "test");

        val plan = Fold.plan("a", headerOnly, null, List.of(), () -> new Composition(Set.of(), Map.of(), List.of()));

        assertNull(plan.foldedName());
        assertNull(plan.foldedHorizon());
        assertEquals(List.of(), plan.deleted());
        assertEquals(List.of("a/x.yaml"), plan.headers());
        assertEquals("b/plateau.yaml", plan.intoManifest());
    }

    @Test
    void shouldNotListAnEntryThatNamesAnElementOfThePlateauBelow() {
        val plan = Fold.plan("a", tree(), null, List.of(), FoldTest::composition);

        assertEquals(1, plan.replaces().size());
        assertFalse(plan.rewritten().contains("b/other.yaml"));
    }

    @Test
    void shouldListAnEntryOfSeveralReferencesWithWhatTheyReplaced() {
        val composition = new Composition(
            Set.of("shop.a1", "shop.a2"),
            Map.of("shop.a1", List.of("shop.old", "shop.older"), "shop.a2", List.of("shop.old")),
            List.of(new Entry("b/z.yaml", "shop.b1", List.of("shop.a2", "shop.far", "shop.a1")))
        );

        val plan = Fold.plan("a", tree(), null, List.of(), () -> composition);

        assertEquals(
            List.of(
                new ReplacesChange(
                    "b/z.yaml",
                    "shop.b1",
                    List.of("shop.a2", "shop.a1"),
                    List.of("shop.old", "shop.older")
                )
            ),
            plan.replaces()
        );
    }

    @Test
    void shouldSayThatTheReplacedElementsReplacedNothing() {
        val composition = new Composition(
            Set.of("shop.a2"),
            Map.of("shop.a2", List.of()),
            List.of(new Entry("b/z.yaml", "shop.b1", List.of("shop.a2")))
        );

        val plan = Fold.plan("a", tree(), null, List.of(), () -> composition);

        assertEquals(
            List.of(new ReplacesChange("b/z.yaml", "shop.b1", List.of("shop.a2"), List.of())),
            plan.replaces()
        );
    }

    @Test
    void shouldListAPatchThatSetsReplacesByItsPlace() {
        val composition = new Composition(
            Set.of("shop.a1"),
            Map.of("shop.a1", List.of("shop.old")),
            List.of(new Entry("patch 2 of `b`", "shop.b1", List.of("shop.a1")))
        );

        val plan = Fold.plan("a", tree(), null, List.of(), () -> composition);

        assertEquals(
            List.of(new ReplacesChange("patch 2 of `b`", "shop.b1", List.of("shop.a1"), List.of("shop.old"))),
            plan.replaces()
        );
        assertEquals(List.of("a/x.yaml", "a/y.yaml", "b/plateau.yaml"), plan.rewritten());
    }

    @Test
    void shouldHaveNothingToDeleteWhenOnlyHeadersNameThePlateau() {
        val headerOnly = PlateauTree.of(
            List.of(declared("b", "a", 3)),
            Map.of("a", List.of("a/x.yaml"), "b", List.of("b/z.yaml")),
            "test"
        );

        val plan = Fold.plan("a", headerOnly, null, List.of(), () -> new Composition(Set.of(), Map.of(), List.of()));

        assertEquals(List.of(), plan.deleted());
        assertEquals(0, plan.foldedPatches());
        assertEquals(3, plan.intoPatches());
        assertEquals(List.of("a/x.yaml", "b/plateau.yaml"), plan.rewritten());
        assertEquals(List.of(), plan.replaces());
    }

    @Test
    void shouldGiveTheParentOfTheFoldedPlateauToThePlateauAbove() {
        val deeper = PlateauTree.of(
            List.of(declared("m", null, 1), declared("a", "m", 2), declared("b", "a", 3)),
            Map.of(),
            "test"
        );

        val plan = Fold.plan("a", deeper, null, List.of(), () -> new Composition(Set.of(), Map.of(), List.of()));

        assertEquals("m", plan.newParent());
        assertEquals(List.of("baseline", "m"), plan.stay());
    }

    @Test
    void shouldGiveTheSamePlanTwice() {
        assertEquals(
            Fold.plan("a", tree(), null, List.of(), FoldTest::composition),
            Fold.plan("a", tree(), null, List.of(), FoldTest::composition)
        );
    }
}

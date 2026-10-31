package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.workspace.FoldCheck.ComparisonLines;
import io.morin.archicode.workspace.FoldCheck.Snapshot;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * What the comparison of two snapshots says (wave 028, run 0208, DEC-4): {@link FoldCheck} is called with hand-made
 * snapshots, without loading a workspace.
 */
class FoldCheckTest {

    private static final Fold.Plan PLAN = new Fold.Plan(
        "inhouse",
        "marketplace",
        "baseline",
        List.of(),
        List.of(),
        0,
        0,
        List.of(),
        List.of("baseline", "saas"),
        List.of(),
        "marketplace/plateau.yaml",
        null,
        null
    );

    private static ComparisonLines lines(List<String> rows, List<String> warnings, List<String> cascade) {
        return new ComparisonLines(rows, warnings, cascade);
    }

    private static Snapshot snapshot() {
        val models = new LinkedHashMap<String, List<String>>();
        models.put("baseline", List.of("shop {\"kind\":\"system\"}", "shop.web {\"kind\":\"container\"}"));
        models.put("saas", List.of("shop {\"kind\":\"system\"}"));
        val comparisons = new LinkedHashMap<String, ComparisonLines>();
        comparisons.put("baseline -> saas", lines(List.of("row 1", "row 2"), List.of("warn"), List.of("cascade 1")));
        comparisons.put("saas -> baseline", lines(List.of("row 3"), List.of(), List.of()));
        return new Snapshot(models, comparisons);
    }

    private static Snapshot with(Map<String, List<String>> models, Map<String, ComparisonLines> comparisons) {
        return new Snapshot(models, comparisons);
    }

    @Test
    void shouldFindNoDifferenceBetweenEqualSnapshots() {
        assertTrue(FoldCheck.firstDifference(PLAN, snapshot(), snapshot()).isEmpty());
    }

    @Test
    void shouldTellAChangedLineOfAModel() {
        val after = snapshot();
        val models = new LinkedHashMap<>(after.models());
        models.put("saas", List.of("shop {\"kind\":\"person\"}"));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(models, after.comparisons())).orElseThrow();

        assertEquals(
            "the fold of `inhouse` into `marketplace` would change the plateau `saas`: before the fold it has " +
                "shop {\"kind\":\"system\"}, after it shop {\"kind\":\"person\"}: no file is written",
            sentence
        );
    }

    @Test
    void shouldTellAMissingElement() {
        val after = snapshot();
        val models = new LinkedHashMap<>(after.models());
        models.put("baseline", List.of("shop {\"kind\":\"system\"}"));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(models, after.comparisons())).orElseThrow();

        assertEquals(
            "the fold of `inhouse` into `marketplace` would change the plateau `baseline`: before the fold it has " +
                "shop.web {\"kind\":\"container\"}, after it nothing: no file is written",
            sentence
        );
    }

    @Test
    void shouldTellAChangedRowOfAComparison() {
        val after = snapshot();
        val comparisons = new LinkedHashMap<>(after.comparisons());
        comparisons.put(
            "baseline -> saas",
            lines(List.of("row 1", "row 2 changed"), List.of("warn"), List.of("cascade 1"))
        );

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(after.models(), comparisons)).orElseThrow();

        assertEquals(
            "the fold of `inhouse` into `marketplace` would change how the plateau `baseline` compares with `saas`: " +
                "row 2 becomes row 2 changed: no file is written",
            sentence
        );
    }

    @Test
    void shouldTellAChangedWarning() {
        val after = snapshot();
        val comparisons = new LinkedHashMap<>(after.comparisons());
        comparisons.put("baseline -> saas", lines(List.of("row 1", "row 2"), List.of(), List.of("cascade 1")));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(after.models(), comparisons)).orElseThrow();

        assertEquals(
            "the fold of `inhouse` into `marketplace` would change how the plateau `baseline` compares with `saas`: " +
                "warn becomes nothing: no file is written",
            sentence
        );
    }

    @Test
    void shouldTellACascadeThatDiffersInItsElement() {
        val after = snapshot();
        val comparisons = new LinkedHashMap<>(after.comparisons());
        comparisons.put("baseline -> saas", lines(List.of("row 1", "row 2"), List.of("warn"), List.of("cascade 2")));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(after.models(), comparisons)).orElseThrow();

        assertTrue(sentence.contains("cascade 1 becomes cascade 2"), sentence);
    }

    @Test
    void shouldIgnoreAMissingPairOnBothSides() {
        val models = Map.of("baseline", List.of("shop {}"));

        assertTrue(FoldCheck.firstDifference(PLAN, with(models, Map.of()), with(models, Map.of())).isEmpty());
    }

    @Test
    void shouldGiveTheSameLinesOfTwoEqualElementsInTwoOrders() {
        // two elements that are equal once their sets are sorted give the same canonical line (ASM-4): the snapshot holds
        // lines, so equal lines are equal whatever the order the sets were read in
        val one = with(Map.of("baseline", List.of("a {\"tags\":[\"x\",\"y\"]}")), Map.of());
        val two = with(Map.of("baseline", List.of("a {\"tags\":[\"x\",\"y\"]}")), Map.of());

        assertTrue(FoldCheck.firstDifference(PLAN, one, two).isEmpty());
    }

    @Test
    void shouldTellTheFirstDifferenceOfTheFirstPlateauById() {
        val after = snapshot();
        val models = new LinkedHashMap<String, List<String>>();
        models.put("saas", List.of("other"));
        models.put("baseline", List.of("other"));
        val comparisons = new LinkedHashMap<>(after.comparisons());
        comparisons.put("baseline -> saas", lines(List.of(), List.of(), List.of()));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(models, comparisons)).orElseThrow();

        assertTrue(sentence.contains("the plateau `baseline`"), sentence);
    }

    @Test
    void shouldWalkTheModelsBeforeThePairs() {
        val after = snapshot();
        val models = new LinkedHashMap<>(after.models());
        models.put("saas", List.of());
        val comparisons = new LinkedHashMap<>(after.comparisons());
        comparisons.put("baseline -> saas", lines(List.of(), List.of(), List.of()));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(models, comparisons)).orElseThrow();

        assertTrue(sentence.contains("would change the plateau `saas`"), sentence);
    }

    @Test
    void shouldWalkThePairsInTheOrderOfTheirIds() {
        val after = snapshot();
        val comparisons = new LinkedHashMap<String, ComparisonLines>();
        comparisons.put("saas -> baseline", lines(List.of("changed"), List.of(), List.of()));
        comparisons.put("baseline -> saas", lines(List.of("changed"), List.of(), List.of()));

        val sentence = FoldCheck.firstDifference(PLAN, snapshot(), with(after.models(), comparisons)).orElseThrow();

        assertTrue(sentence.contains("how the plateau `baseline` compares with `saas`"), sentence);
    }
}

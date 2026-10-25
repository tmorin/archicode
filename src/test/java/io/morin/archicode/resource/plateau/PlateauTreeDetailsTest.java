package io.morin.archicode.resource.plateau;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The details of the tree of plateaus that the sentences of {@code PlateauModelTest} do not reach: how a horizon reads as a
 * period, how two ids are told one letter apart, how a plateau declared more than once is said, and the patches that set the
 * same field twice.
 */
class PlateauTreeDetailsTest {

    @Test
    void shouldReadTheLabelsOfAHorizonAsPeriods() {
        assertArrayEquals(new long[] { 20260101, 20261231 }, PlateauTree.horizonPeriod("2026"));
        assertArrayEquals(new long[] { 20261001, 20261031 }, PlateauTree.horizonPeriod("2026-10"));
        assertArrayEquals(new long[] { 20261018, 20261018 }, PlateauTree.horizonPeriod("2026-10-18"));
        assertArrayEquals(new long[] { 20261001, 20261231 }, PlateauTree.horizonPeriod("2026-Q4"));
        assertArrayEquals(new long[] { 20261001, 20261231 }, PlateauTree.horizonPeriod("2026q4"));
        assertArrayEquals(new long[] { 20260701, 20261231 }, PlateauTree.horizonPeriod(" 2026-H2 "));
        assertArrayEquals(new long[] { 20260101, 20260630 }, PlateauTree.horizonPeriod("2026H1"));
    }

    @Test
    void shouldReadNoPeriodFromALabelThatIsNoDate() {
        assertArrayEquals(new long[0], PlateauTree.horizonPeriod(null));
        assertArrayEquals(new long[0], PlateauTree.horizonPeriod("soon"));
        assertArrayEquals(new long[0], PlateauTree.horizonPeriod("2026-13"), "there is no thirteenth month");
        assertArrayEquals(new long[0], PlateauTree.horizonPeriod("2026-02-30"), "nor a thirtieth of February");
        assertArrayEquals(
            new long[0],
            PlateauTree.horizonPeriod("0099"),
            "a year before 100 is read as 19xx by the page: none in both"
        );
        assertArrayEquals(new long[0], PlateauTree.horizonPeriod("0099-10"));
        assertArrayEquals(new long[0], PlateauTree.horizonPeriod("0099-10-18"));
    }

    @Test
    void shouldTellTwoIdsOneLetterApart() {
        assertTrue(PlateauTree.oneLetterApart("saas", "saaz"), "one letter changed");
        assertTrue(PlateauTree.oneLetterApart("saas", "sas"), "one letter removed");
        assertTrue(PlateauTree.oneLetterApart("sas", "saas"), "one letter added");
        assertFalse(PlateauTree.oneLetterApart("saas", "saas"), "the same id");
        assertFalse(PlateauTree.oneLetterApart("saas", "sa"), "two letters removed");
        assertFalse(PlateauTree.oneLetterApart("saas", "sbbs"), "two letters changed");
    }

    @Test
    void shouldSayWhereAPlateauIsDeclaredMoreThanOnce() {
        assertEquals(
            "the plateau `p` is declared twice in `a.yaml`",
            PlateauTree.duplicate("p", List.of("a.yaml", "a.yaml"))
        );
        assertEquals(
            "the plateau `p` is declared 3 times in `a.yaml`",
            PlateauTree.duplicate("p", List.of("a.yaml", "a.yaml", "a.yaml"))
        );
        assertEquals(
            "the plateau `p` is declared twice: in `a.yaml` and `b.yaml`",
            PlateauTree.duplicate("p", List.of("b.yaml", "a.yaml"))
        );
        assertEquals(
            "the plateau `p` is declared 3 times: in `a.yaml`, `b.yaml` and `c.yaml`",
            PlateauTree.duplicate("p", List.of("c.yaml", "a.yaml", "b.yaml"))
        );
    }

    private static Patch set(String target, String field, Patch.Where where) {
        return Patch.builder().operator(Patch.Operator.SET).target(target).field(field).where(where).build();
    }

    private static List<String> warningsOf(List<Patch> patches) {
        val later = Plateau.builder().id("later").override("baseline").patches(patches).build();
        return PlateauTree.of(
            List.of(new PlateauTree.Declared(later, "later.yaml")),
            Map.of(),
            "later.yaml"
        ).warnings();
    }

    @Test
    void shouldWarnWhenTwoPatchesSetTheSameFieldAndTheLastOneWins() {
        assertEquals(
            List.of("the plateau `later` sets `name` of `shop` in patches 1 and 3: the last one wins"),
            warningsOf(List.of(set("shop", "name", null), set("shop", "description", null), set("shop", "name", null)))
        );
    }

    @Test
    void shouldNameTheRelationshipWhenTheFieldIsFoundByItsDestinationAndLabel() {
        val calls = Patch.Where.builder().destination("billing").label("calls").build();
        val plain = Patch.Where.builder().destination("billing").build();
        assertEquals(
            List.of(
                "the plateau `later` sets `relationships` of `shop` (the relationship towards `billing` labelled `calls`) in patches 1 and 2: the last one wins",
                "the plateau `later` sets `relationships` of `shop` (the relationship towards `billing`) in patches 3 and 4: the last one wins"
            ),
            warningsOf(
                List.of(
                    set("shop", null, calls),
                    set("shop", null, calls),
                    set("shop", null, plain),
                    set("shop", "relationships", plain)
                )
            )
        );
    }

    @Test
    void shouldNotWarnForPatchesThatSetDifferentFieldsOrOtherTargetsOrNothing() {
        val remove = Patch.builder().operator(Patch.Operator.REMOVE).target("shop").build();
        val byPath = Patch.builder().operator(Patch.Operator.SET).jsonPath("$..elements").field("name").build();
        val noField = Patch.builder().operator(Patch.Operator.SET).target("shop").build();
        assertEquals(
            List.of(),
            warningsOf(
                List.of(
                    set("shop", "name", null),
                    set("billing", "name", null),
                    set("shop", "description", null),
                    remove,
                    remove,
                    byPath,
                    byPath,
                    noField,
                    noField
                )
            )
        );
    }
}

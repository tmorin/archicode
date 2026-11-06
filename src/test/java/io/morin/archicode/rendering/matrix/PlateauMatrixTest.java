package io.morin.archicode.rendering.matrix;

import static io.morin.archicode.viewpoint.kernel.ComparisonSketch.comparison;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.matrix.PlateauMatrix.Node;
import io.morin.archicode.resource.workspace.Settings;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The lineage rule on small comparisons made by hand: no workspace, no kernel. */
class PlateauMatrixTest {

    private static final String APP = "application";

    private static Settings.Plateau plateau(String id) {
        return Settings.Plateau.builder().id(id).build();
    }

    private static List<Node> present(String... references) {
        val out = new ArrayList<Node>();
        for (val r : references) {
            out.add(new Node(APP, r, "system", r + "!"));
        }
        return out;
    }

    private static List<String> states(PlateauMatrix.Row row) {
        return row.cells().stream().map(PlateauMatrix.Cell::state).toList();
    }

    private static PlateauMatrix.Row row(PlateauMatrix matrix, String reference) {
        return matrix
            .rows()
            .stream()
            .filter(r -> r.reference().equals(reference))
            .findFirst()
            .orElseThrow();
    }

    @Test
    void anElementThatMovesInTwoStepsIsOneRow() {
        // a -> b -> c, each step a rename; the Span sees the whole way
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2"), plateau("p3")),
            List.of(present("a"), present("b"), present("c")),
            List.of(
                comparison().element(APP, "b", "moved", "a").build(),
                comparison().element(APP, "c", "moved", "b").build()
            ),
            comparison().element(APP, "c", "moved", "a").build()
        );
        assertEquals(1, matrix.rows().size());
        assertEquals(0, matrix.unchanged());
        val row = matrix.rows().getFirst();
        assertEquals("c", row.reference());
        assertEquals(List.of("present", "moved", "moved"), states(row));
        assertEquals(List.of("a", "b", "c"), row.cells().stream().map(PlateauMatrix.Cell::reference).toList());
        assertEquals(List.of("a"), row.cells().get(1).from());
        assertEquals("moved", row.span().state());
        assertEquals(List.of("a"), row.span().from());
    }

    @Test
    void aSplitIsTwoRowsWithTheSameOrigin() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(present("a"), present("b", "c")),
            List.of(comparison().element(APP, "b", "split", "a").element(APP, "c", "split", "a").build()),
            null
        );
        assertEquals(2, matrix.rows().size());
        assertNull(matrix.spanComparison());
        assertEquals(List.of("b", "c"), matrix.rows().stream().map(PlateauMatrix.Row::reference).toList());
        for (val row : matrix.rows()) {
            assertEquals(List.of("present", "split"), states(row));
            assertEquals("a", row.cells().getFirst().reference());
            assertEquals(List.of("a"), row.cells().get(1).from());
            assertNull(row.span());
        }
    }

    @Test
    void aMergeIsOneRowThatListsItsOrigins() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(present("a", "b"), present("c")),
            List.of(comparison().element(APP, "c", "merged", "a", "b").build()),
            null
        );
        assertEquals(1, matrix.rows().size());
        val row = matrix.rows().getFirst();
        assertEquals(List.of("absent", "merged"), states(row));
        assertEquals(List.of("a", "b"), row.cells().get(1).from());
        assertEquals("merged from a, b", MatrixReport.word("merged", row.cells().get(1).from()));
    }

    @Test
    void anElementThatLivesOnlyInTheMiddleHasAnEmptySpan() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2"), plateau("p3")),
            List.of(present(), present("t"), present()),
            List.of(comparison().element(APP, "t", "new").build(), comparison().build()),
            comparison().build()
        );
        assertEquals(1, matrix.rows().size());
        val row = matrix.rows().getFirst();
        assertEquals(List.of("absent", "new", "removed"), states(row));
        assertNull(row.span());
        assertEquals(
            "-",
            MatrixReport.render(matrix, GapFormat.TEXT)
                .lines()
                .filter(l -> l.startsWith("application"))
                .map(l -> l.substring(l.lastIndexOf(' ') + 1))
                .findFirst()
                .orElseThrow()
        );
    }

    @Test
    void anElementTheLastPlateauLacksIsRemovedInTheSpan() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2"), plateau("p3")),
            List.of(present("x", "y"), present("x", "y"), present("y")),
            List.of(
                comparison().element(APP, "x", "none").element(APP, "y", "none").build(),
                comparison().element(APP, "y", "none").element(APP, "x", "removed").build()
            ),
            comparison().element(APP, "y", "none").element(APP, "x", "removed").build()
        );
        assertEquals(1, matrix.rows().size());
        assertEquals(1, matrix.unchanged());
        val row = row(matrix, "x");
        assertEquals(List.of("present", "present", "removed"), states(row));
        assertEquals("removed", row.span().state());
    }

    @Test
    void aNewElementStartsItsRowWhereItAppears() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2"), plateau("p3")),
            List.of(present(), present(), present("n")),
            List.of(comparison().build(), comparison().element(APP, "n", "new", List.of("name")).build()),
            comparison().element(APP, "n", "new", List.of("name")).build()
        );
        val row = matrix.rows().getFirst();
        assertEquals(List.of("absent", "absent", "new"), states(row));
        assertEquals(List.of("name"), row.cells().get(2).natures());
        assertEquals("new", row.span().state());
    }

    @Test
    void aRowWithoutAChangeIsLeftOutAndCounted() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(present("a", "b", "z"), present("a", "b", "z", "n")),
            List.of(
                comparison()
                    .element(APP, "a", "none")
                    .element(APP, "b", "changed")
                    .element(APP, "z", "none")
                    .element(APP, "n", "new")
                    .build()
            ),
            null
        );
        assertEquals(List.of("b", "n"), matrix.rows().stream().map(PlateauMatrix.Row::reference).toList());
        assertEquals(2, matrix.unchanged());
    }

    @Test
    void anElementTheComparisonDoesNotListIsPresent() {
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(present("a"), present("a")),
            List.of(comparison().build()),
            null
        );
        assertEquals(0, matrix.rows().size());
        assertEquals(1, matrix.unchanged());
    }

    @Test
    void rowsAreSortedByLayerThenReference() {
        val first = new Node("technology", "a", "node", "A");
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(
                List.of(),
                List.of(
                    first,
                    new Node(APP, "b", "system", "B"),
                    new Node(APP, "a", "system", "A"),
                    new Node("other", "a", "x", "X"),
                    new Node(APP, "😀", "system", "E"),
                    new Node(APP, "Ａ", "system", "F")
                )
            ),
            List.of(
                comparison()
                    .element("technology", "a", "new")
                    .element(APP, "b", "new")
                    .element(APP, "a", "new")
                    .element("other", "a", "new")
                    .element(APP, "😀", "new")
                    .element(APP, "Ａ", "new")
                    .build()
            ),
            null
        );
        // by code point: U+FF21 comes before U+1F600, which UTF-16 order would reverse
        assertEquals(
            List.of("a", "b", "Ａ", "😀", "a", "a"),
            matrix.rows().stream().map(PlateauMatrix.Row::reference).toList()
        );
        assertEquals(
            List.of(APP, APP, APP, APP, "technology", "other"),
            matrix.rows().stream().map(PlateauMatrix.Row::layer).toList()
        );
    }

    @Test
    void theSameReferenceTwiceKeepsTheEarlierRowFirst() {
        // x is removed and comes back: two rows with one reference, the earlier column first
        val matrix = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2"), plateau("p3")),
            List.of(present("x"), present(), present("x")),
            List.of(comparison().build(), comparison().element(APP, "x", "new").build()),
            comparison().element(APP, "x", "none").build()
        );
        assertEquals(2, matrix.rows().size());
        assertEquals(List.of("present", "removed", "absent"), states(matrix.rows().get(0)));
        assertEquals(List.of("absent", "absent", "new"), states(matrix.rows().get(1)));
    }

    @Test
    void theSizesMustAgree() {
        val two = List.of(plateau("p1"), plateau("p2"));
        val one = present("a");
        val ones = List.of(one);
        assertThrows(IllegalArgumentException.class, () ->
            PlateauMatrix.of(List.of(plateau("p1")), ones, List.of(), null)
        );
        assertThrows(IllegalArgumentException.class, () ->
            PlateauMatrix.of(two, ones, List.of(comparison().build()), null)
        );
        assertThrows(IllegalArgumentException.class, () -> PlateauMatrix.of(two, List.of(one, one), List.of(), null));
        assertThrows(IllegalArgumentException.class, () ->
            PlateauMatrix.of(two, List.of(one, one), List.of(comparison().build()), comparison().build())
        );
        assertThrows(IllegalArgumentException.class, () ->
            PlateauMatrix.of(
                List.of(plateau("p1"), plateau("p2"), plateau("p3")),
                List.of(one, one, one),
                List.of(comparison().build(), comparison().build()),
                null
            )
        );
    }

    private static PlateauMatrix sample() {
        return PlateauMatrix.of(
            List.of(
                Settings.Plateau.builder().id("p1").name("First").horizon("2026").build(),
                plateau("p2"),
                plateau("p3")
            ),
            List.of(present("a", "k", "m|n"), present("b", "k", "m|n", "t"), present("c", "k", "m|n", "t")),
            List.of(
                comparison()
                    .element(APP, "b", "moved", "a")
                    .element(APP, "k", "none")
                    .element(APP, "m|n", "none")
                    .element(APP, "t", "new")
                    .build(),
                comparison()
                    .element(APP, "c", "moved", "b")
                    .element(APP, "k", "changed")
                    .element(APP, "m|n", "none")
                    .element(APP, "t", "none")
                    .build()
            ),
            comparison()
                .element(APP, "c", "moved", "a")
                .element(APP, "k", "changed")
                .element(APP, "m|n", "none")
                .element(APP, "t", "new")
                .build()
        );
    }

    @Test
    @SneakyThrows
    void theJsonKeysAreInTheOrderOfTheContractAndTheBytesAreStable() {
        val json = MatrixReport.render(sample(), GapFormat.JSON);
        assertEquals(json, MatrixReport.render(sample(), GapFormat.JSON));
        val root = new ObjectMapper().readTree(json);
        assertEquals(List.of("path", "columns", "span", "rows", "unchanged"), names(root));
        assertEquals(List.of("plateau", "name", "horizon"), names(root.get("columns").get(0)));
        assertEquals(List.of("from", "to", "counts"), names(root.get("span")));
        assertEquals(List.of("elements", "relationships"), names(root.get("span").get("counts")));
        assertEquals(
            List.of("new", "changed", "removed", "moved", "split", "merged"),
            names(root.get("span").get("counts").get("elements"))
        );
        assertEquals(List.of("new", "changed", "removed"), names(root.get("span").get("counts").get("relationships")));
        val row = root.get("rows").get(0);
        assertEquals(List.of("layer", "reference", "kind", "name", "cells", "span"), names(row));
        assertEquals(
            List.of("plateau", "state", "from", "natures"),
            names(root.get("rows").get(2).get("cells").get(0))
        );
        assertEquals(List.of("plateau", "state", "reference", "from", "natures"), names(row.get("cells").get(1)));
        assertEquals(List.of("state", "from", "natures"), names(row.get("span")));
        assertTrue(json.endsWith("}\n"));
        assertTrue(json.contains("\n  \"path\": ["));
    }

    @Test
    @SneakyThrows
    void aPathOfTwoPlateausHasNoSpanAndATransientHasANullSpan() {
        val two = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(present(), present("n")),
            List.of(comparison().element(APP, "n", "new").build()),
            null
        );
        assertTrue(new ObjectMapper().readTree(MatrixReport.render(two, GapFormat.JSON)).get("span").isNull());
        assertTrue(
            new ObjectMapper()
                .readTree(MatrixReport.render(two, GapFormat.JSON))
                .get("rows")
                .get(0)
                .get("span")
                .isNull()
        );
        val empty = PlateauMatrix.of(
            List.of(plateau("p1"), plateau("p2")),
            List.of(present(), present()),
            List.of(comparison().build()),
            null
        );
        assertTrue(MatrixReport.render(empty, GapFormat.TEXT).contains("0 rows without a change are left out"));
        assertTrue(MatrixReport.render(empty, GapFormat.MARKDOWN).endsWith("0 rows without a change are left out\n"));
    }

    private static List<String> names(com.fasterxml.jackson.databind.JsonNode node) {
        val out = new ArrayList<String>();
        node.fieldNames().forEachRemaining(out::add);
        return out;
    }

    @Test
    void theTextCellsUseTheWordsOfTheContract() {
        val text = MatrixReport.render(sample(), GapFormat.TEXT);
        assertEquals(text, MatrixReport.render(sample(), GapFormat.TEXT));
        assertTrue(text.startsWith("matrix of p1, p2, p3\np1 -> p2: elements +1 ~0 -0"), text);
        assertTrue(text.contains("span p1 -> p3:"), text);
        assertTrue(text.contains("replacing 1 moved, 0 split, 0 merged"), text);
        assertTrue(text.contains("LAYER"), text);
        assertTrue(text.contains("moved from a"), text);
        assertTrue(text.contains("moved from b"), text);
        assertTrue(text.contains("changed"), text);
        assertTrue(text.contains("1 row without a change is left out"), text);
        text.lines().forEach(l -> assertEquals(l.stripTrailing(), l));
        assertEquals("=", MatrixReport.word("present", List.of()));
        assertEquals("-", MatrixReport.word("absent", List.of()));
        assertEquals("removed", MatrixReport.word("removed", List.of()));
        assertEquals("new", MatrixReport.word("new", List.of()));
        assertEquals("moved", MatrixReport.word("moved", List.of()));
        assertEquals("split from a", MatrixReport.word("split", List.of("a")));
    }

    @Test
    void theMarkdownEscapesThePipe() {
        val md = MatrixReport.render(sample(), GapFormat.MARKDOWN);
        assertTrue(md.startsWith("# Matrix of p1, p2, p3\n\n- p1 -> p2: "), md);
        assertTrue(md.contains("| LAYER | REFERENCE | KIND | p1 | p2 | p3 | SPAN |\n| --- |"), md);
        assertTrue(md.contains("| application | c | system | = | moved from a | moved from b | moved from a |"), md);
    }
}

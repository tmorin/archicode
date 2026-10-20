package io.morin.archicode.rendering.gap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The layout of the text report: how a cell wraps and how a table shares its width (#26). Plain strings, no workspace; the
 * report on a pair of plateaus is {@code DiffWidthTest}.
 */
class TextWrapTest {

    @Test
    void aTextThatFitsIsOneLine() {
        assertEquals(List.of("one two"), TextWrap.wrap("one two", 7));
        assertEquals(List.of(""), TextWrap.wrap("", 5));
    }

    @Test
    void wrapsAtTheSpaces() {
        assertEquals(List.of("one two", "three", "four"), TextWrap.wrap("one two three four", 8));
        assertEquals(List.of("a", "b", "c"), TextWrap.wrap("a b c", 1));
    }

    @Test
    void aWordWithoutSpaceIsCutAfterTheDotsAndTheSlashes() {
        assertEquals(List.of("alpha.beta.", "gamma.delta"), TextWrap.wrap("alpha.beta.gamma.delta", 12));
        assertEquals(List.of("alpha.", "beta.", "gamma"), TextWrap.wrap("alpha.beta.gamma", 8));
        assertEquals(List.of("src/main/", "java/Foo"), TextWrap.wrap("src/main/java/Foo", 10));
        // the natures of a row are a list joined by commas
        assertEquals(
            List.of("description,", "relationships-", "removed"),
            TextWrap.wrap("description,relationships-removed", 14)
        );
    }

    @Test
    void aSegmentLongerThanALineIsCutAfterTheHyphensThenWhereTheLineEnds() {
        assertEquals(
            List.of("goods-in-", "reception-", "and-quality.", "control"),
            TextWrap.wrap("goods-in-reception-and-quality.control", 12)
        );
        assertEquals(List.of("abc_def_", "ghijklmn", "o"), TextWrap.wrap("abc_def_ghijklmno", 8));
    }

    @Test
    void aSegmentWithNothingToCutAtIsCutWhereTheLineEnds() {
        assertEquals(List.of("abcde", "fghij", "k.lm"), TextWrap.wrap("abcdefghijk.lm", 5));
        assertEquals(List.of("abc", "def"), TextWrap.wrap("abcdef", 3));
    }

    @Test
    void theWordsThatFollowAFragmentGoOnItsLine() {
        assertEquals(List.of("alpha.beta.", "gamma and", "more"), TextWrap.wrap("alpha.beta.gamma and more", 11));
    }

    @Test
    void nothingIsLostWhenACellWraps() {
        val reference = "a-long-system.a-long-container.a-long-component/and-a-last-segment-that-is-quite-long-too";
        for (int width = 1; width < reference.length() + 2; width++) {
            assertEquals(reference, String.join("", TextWrap.wrap(reference, width)), "width " + width);
            for (val line : TextWrap.wrap(reference, width)) {
                assertTrue(line.length() <= width, width + ": " + line);
            }
        }
    }

    private static String table(int width) {
        val out = new StringBuilder();
        TextWrap.table(
            out,
            List.of(
                List.of("CHANGE", "REFERENCE", "DETAILS"),
                List.of("new", "shop.api", "a short one"),
                List.of(
                    "changed",
                    "shop.web.some.very.long.reference.of.a.component",
                    "name: \"A\" -> \"A longer name than before\""
                )
            ),
            width
        );
        return out.toString();
    }

    @Test
    void aTableThatFitsIsWrittenAsItAlwaysWas() {
        // the longest cell sets the column, two spaces between the columns, the last column as it is, no space at a line end
        val expected = """
        CHANGE   REFERENCE                                         DETAILS
        new      shop.api                                          a short one
        changed  shop.web.some.very.long.reference.of.a.component  name: "A" -> "A longer name than before"
        """;
        assertEquals(expected, table(GapReport.NO_WIDTH));
        // as wide as the table, or wider: the same
        assertEquals(expected, table(table(GapReport.NO_WIDTH).lines().mapToInt(String::length).max().orElseThrow()));
        assertEquals(expected, table(500));
    }

    @Test
    void aTableThatDoesNotFitSharesItsWidthAndKeepsEveryLineWithinIt() {
        val wrapped = table(40);
        val expected = """
        CHANGE   REFERENCE        DETAILS
        new      shop.api         a short one
        changed  shop.web.some.   name: "A" ->
                 very.long.       "A longer name
                 reference.of.a.  than before"
                 component
        """;
        assertEquals(expected, wrapped);
        for (val line : wrapped.split("\n")) {
            assertTrue(line.length() <= 40, line);
            assertEquals(line.stripTrailing(), line);
        }
    }

    @Test
    void whenEvenTheHeadingsDoNotFitNothingIsCutOff() {
        val wrapped = table(10);
        assertTrue(wrapped.startsWith("CHANGE  REFERENCE  DETAILS\n"), wrapped);
    }
}

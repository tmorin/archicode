package io.morin.archicode.cli;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class LineDiffTest {

    @Test
    void identicalInputYieldsEmptyString() {
        Assertions.assertEquals("", LineDiff.unified("f.yaml", "f.yaml", "a\nb\nc\n", "a\nb\nc\n"));
        Assertions.assertEquals("", LineDiff.unified("f.yaml", "f.yaml", "", ""));
    }

    @Test
    void singleLineModificationYieldsOneHunkWithOneMinusAndOnePlus() {
        var before = "l1\nl2\nl3\nOLD\nl5\nl6\nl7";
        var after = "l1\nl2\nl3\nNEW\nl5\nl6\nl7";

        var diff = LineDiff.unified("old.yaml", "new.yaml", before, after);

        Assertions.assertEquals(
            """
            --- a/old.yaml
            +++ b/new.yaml
            @@ -1,7 +1,7 @@
             l1
             l2
             l3
            -OLD
            +NEW
             l5
             l6
             l7
            """,
            diff
        );
        Assertions.assertEquals(1, countPrefixed(diff, "-OLD"));
        Assertions.assertEquals(1, countPrefixed(diff, "+NEW"));
        Assertions.assertEquals(1, countHunks(diff));
    }

    @Test
    void pureInsertionInTheMiddleYieldsOnlyPlusLines() {
        var diff = LineDiff.unified("f.yaml", "f.yaml", "l1\nl2\nl3\nl4", "l1\nl2\nNEW\nl3\nl4");

        Assertions.assertEquals(
            """
            --- a/f.yaml
            +++ b/f.yaml
            @@ -1,4 +1,5 @@
             l1
             l2
            +NEW
             l3
             l4
            """,
            diff
        );
    }

    @Test
    void pureDeletionInTheMiddleYieldsOnlyMinusLines() {
        var diff = LineDiff.unified("f.yaml", "f.yaml", "l1\nl2\nGONE\nl3\nl4", "l1\nl2\nl3\nl4");

        Assertions.assertEquals(
            """
            --- a/f.yaml
            +++ b/f.yaml
            @@ -1,5 +1,4 @@
             l1
             l2
            -GONE
             l3
             l4
            """,
            diff
        );
    }

    @Test
    void createdFileUsesTheZeroZeroBeforeRange() {
        var diff = LineDiff.unified("new.yaml", "new.yaml", "", "x\ny");

        Assertions.assertEquals(
            """
            --- a/new.yaml
            +++ b/new.yaml
            @@ -0,0 +1,2 @@
            +x
            +y
            """,
            diff
        );
        Assertions.assertTrue(diff.contains("@@ -0,0 "), diff);
    }

    @Test
    void deletedFileUsesTheZeroZeroAfterRange() {
        var diff = LineDiff.unified("gone.yaml", "gone.yaml", "x\ny", "");

        Assertions.assertEquals(
            """
            --- a/gone.yaml
            +++ b/gone.yaml
            @@ -1,2 +0,0 @@
            -x
            -y
            """,
            diff
        );
        Assertions.assertTrue(diff.contains(" +0,0 @@"), diff);
    }

    @Test
    void isBinaryIsTrueOnlyForContentHoldingANulCharacter() {
        Assertions.assertTrue(LineDiff.isBinary("abc\0def"));
        Assertions.assertTrue(LineDiff.isBinary("\0"));
        Assertions.assertFalse(LineDiff.isBinary("abc\ndef\n"));
        Assertions.assertFalse(LineDiff.isBinary(""));
    }

    @Test
    void isTooLargeGuardsBothSidesAndUnifiedRefusesSuchInput() {
        var oversize = "x\n".repeat(LineDiff.MAX_LINES); // MAX_LINES newlines, so MAX_LINES + 1 lines
        var atTheLimit = "x\n".repeat(LineDiff.MAX_LINES - 1) + "x"; // exactly MAX_LINES lines

        Assertions.assertTrue(LineDiff.isTooLarge(oversize, ""));
        Assertions.assertTrue(LineDiff.isTooLarge("", oversize));
        Assertions.assertFalse(LineDiff.isTooLarge(atTheLimit, atTheLimit));
        Assertions.assertFalse(LineDiff.isTooLarge("a\nb", ""));

        var thrown = Assertions.assertThrows(IllegalArgumentException.class, () ->
            LineDiff.unified("big.yaml", "big.yaml", oversize, "y\n")
        );
        Assertions.assertTrue(thrown.getMessage().contains(String.valueOf(LineDiff.MAX_LINES)), thrown.getMessage());

        Assertions.assertThrows(IllegalArgumentException.class, () ->
            LineDiff.unified("big.yaml", "big.yaml", "y\n", oversize)
        );
    }

    @Test
    void aMissingTrailingNewlineOnOneSideShowsAsABareMinusLine() {
        var diff = LineDiff.unified("f.yaml", "f.yaml", "a\nb\n", "a\nb");

        Assertions.assertEquals(
            """
            --- a/f.yaml
            +++ b/f.yaml
            @@ -1,3 +1,2 @@
             a
             b
            -
            """,
            diff
        );

        // The reverse direction is the mirror image: the final empty line is added back.
        Assertions.assertEquals(
            """
            --- a/f.yaml
            +++ b/f.yaml
            @@ -1,2 +1,3 @@
             a
             b
            +
            """,
            LineDiff.unified("f.yaml", "f.yaml", "a\nb", "a\nb\n")
        );
    }

    @Test
    void twoChangesThreeLinesApartAreMergedIntoOneHunk() {
        var before = "l1\nA\nl3\nl4\nl5\nB\nl7";
        var after = "l1\nA2\nl3\nl4\nl5\nB2\nl7";

        var diff = LineDiff.unified("f.yaml", "f.yaml", before, after);

        Assertions.assertEquals(1, countHunks(diff), diff);
        Assertions.assertEquals(
            """
            --- a/f.yaml
            +++ b/f.yaml
            @@ -1,7 +1,7 @@
             l1
            -A
            +A2
             l3
             l4
             l5
            -B
            +B2
             l7
            """,
            diff
        );
    }

    @Test
    void twoChangesFarApartYieldTwoHunks() {
        var middle = "l2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nl10\nl11";
        var before = "A\n" + middle + "\nZ";
        var after = "A2\n" + middle + "\nZ2";

        var diff = LineDiff.unified("f.yaml", "f.yaml", before, after);

        Assertions.assertEquals(2, countHunks(diff), diff);
        Assertions.assertTrue(diff.contains("@@ -1,4 +1,4 @@"), diff);
        Assertions.assertTrue(diff.contains("@@ -9,4 +9,4 @@"), diff);
        Assertions.assertFalse(diff.contains(" l6"), "the uncovered middle must not be rendered: " + diff);
    }

    private static long countHunks(String diff) {
        return countPrefixed(diff, "@@ -");
    }

    private static long countPrefixed(String diff, String prefix) {
        return diff
            .lines()
            .filter(line -> line.startsWith(prefix))
            .count();
    }
}

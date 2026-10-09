package io.morin.archicode.cli;

import java.util.ArrayList;
import java.util.List;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * A dependency-free generator of unified-diff text for two versions of one text file (run-0007 TDD {@code DEC-9}).
 * <p>
 * The class is pure: it performs no I/O, holds no state, and is not a CDI bean. Callers hand it two strings and a
 * name for each side, and get back the same {@code --- a/… / +++ b/… / @@ -l,c +l,c @@} text a reviewer already
 * reads from {@code git diff}. The algorithm is a longest-common-subsequence computed by dynamic programming — exact
 * rather than heuristic — turned into an edit script of equal/delete/insert operations and then grouped into hunks
 * carrying {@value #CONTEXT} lines of context. Correctness is preferred over speed throughout, because a diff that
 * lies is how an operator accepts a change they did not mean to.
 * <p>
 * <strong>Line model.</strong> Each side is split on {@code \n} with {@link String#split(String, int)} and a limit of
 * {@code -1}, so trailing empty fields are kept. A file whose content ends with a newline therefore yields a final
 * empty line, and that empty line takes part in the diff like any other: adding or removing a trailing newline shows
 * up as a bare {@code +} or {@code -} line with no text after the prefix. A file whose content does not end with a
 * newline simply has no such final empty line. This utility deliberately does <em>not</em> emulate git's
 * {@code "\ No newline at end of file"} marker; the presence or absence of the final empty line is the whole
 * representation, and it is consistent in both directions.
 * <p>
 * <strong>Empty sides.</strong> An empty string is modelled as zero lines, not as one empty line. A created file
 * (empty {@code before}) therefore renders {@code @@ -0,0 +1,n @@} and a deleted file (empty {@code after}) renders
 * {@code @@ -1,n +0,0 @@}, matching the standard unified-diff convention for a side that does not exist.
 * <p>
 * <strong>Fallbacks.</strong> Two kinds of input are not worth diffing, and {@link #isBinary(String)} and
 * {@link #isTooLarge(String, String)} let a caller detect them and report the change without diff text instead.
 * Callers are expected to run both checks first; {@link #unified} nonetheless refuses oversize input rather than
 * allocating a quadratic matrix for it.
 */
@UtilityClass
public class LineDiff {

    /**
     * The largest number of lines either side may have before {@link #isTooLarge(String, String)} reports it and
     * {@link #unified} refuses it. The bound exists because the dynamic-programming matrix is
     * {@code O(beforeLines × afterLines)} in size; at this bound the worst allowed case stays tractable.
     */
    public static final int MAX_LINES = 4000;

    /**
     * The number of unchanged lines rendered on each side of a change inside a hunk.
     */
    private static final int CONTEXT = 3;

    /**
     * Render the difference between two versions of one file as unified-diff text.
     * <p>
     * The result is either the empty string — when {@code before} and {@code after} are equal, in which case no
     * header and no hunk is emitted at all — or two header lines followed by one or more hunks. Every emitted line,
     * including the last, is terminated by {@code \n}. Hunk body lines are prefixed by a single space for context, by
     * {@code -} for a line only in {@code before}, and by {@code +} for a line only in {@code after}. Line numbers in
     * hunk headers are 1-based. Two changes close enough that their context windows touch or overlap are rendered as
     * a single merged hunk; changes further apart get a hunk each.
     *
     * @param beforeName the name rendered after {@code --- a/}, typically the file's workspace-relative path
     * @param afterName  the name rendered after {@code +++ b/}, usually the same value as {@code beforeName}
     * @param before     the full content of the file before the change, {@code ""} if it did not exist
     * @param after      the full content of the file after the change, {@code ""} if it was deleted
     * @return the unified-diff text, or {@code ""} when both sides are equal
     * @throws IllegalArgumentException if either side exceeds {@link #MAX_LINES} lines; check
     *                                  {@link #isTooLarge(String, String)} before calling
     */
    public static String unified(
        @NonNull String beforeName,
        @NonNull String afterName,
        @NonNull String before,
        @NonNull String after
    ) {
        if (isTooLarge(before, after)) {
            throw new IllegalArgumentException(
                "cannot diff more than %d lines a side (before=%d, after=%d); check isTooLarge first".formatted(
                    MAX_LINES,
                    countLines(before),
                    countLines(after)
                )
            );
        }
        if (before.equals(after)) {
            return "";
        }
        val operations = editScript(splitLines(before), splitLines(after));
        val builder = new StringBuilder();
        builder.append("--- a/").append(beforeName).append('\n');
        builder.append("+++ b/").append(afterName).append('\n');
        for (val hunk : groupIntoHunks(operations)) {
            appendHunk(builder, operations, hunk[0], hunk[1]);
        }
        return builder.toString();
    }

    /**
     * Tell whether a file's content should be treated as binary rather than diffed.
     * <p>
     * The test is the presence of a {@code U+0000} character, which is the same cheap heuristic git uses on the head
     * of a file: no text manifest contains one, and a file that does is not reviewable as lines.
     *
     * @param content the content to inspect
     * @return {@code true} if {@code content} contains a {@code U+0000} character
     */
    public static boolean isBinary(@NonNull String content) {
        return content.indexOf(0) >= 0;
    }

    /**
     * Tell whether either side is too large to diff.
     * <p>
     * A caller that gets {@code true} here should report the change without diff text rather than calling
     * {@link #unified}, which refuses the same input.
     *
     * @param before the content of the file before the change
     * @param after  the content of the file after the change
     * @return {@code true} if either side has more than {@link #MAX_LINES} lines
     */
    public static boolean isTooLarge(@NonNull String before, @NonNull String after) {
        return countLines(before) > MAX_LINES || countLines(after) > MAX_LINES;
    }

    /**
     * Count the lines of a content string under this class's line model: an empty string has zero lines, and every
     * other string has one line more than it has newline characters.
     *
     * @param content the content to count
     * @return the number of lines
     */
    private static int countLines(String content) {
        if (content.isEmpty()) {
            return 0;
        }
        var count = 1;
        for (var index = 0; index < content.length(); index++) {
            if (content.charAt(index) == '\n') {
                count++;
            }
        }
        return count;
    }

    /**
     * Split a content string into lines, modelling an empty string as zero lines.
     *
     * @param content the content to split
     * @return the lines of {@code content}
     */
    private static String[] splitLines(String content) {
        return content.isEmpty() ? new String[0] : content.split("\n", -1);
    }

    /**
     * Compute the edit script turning {@code beforeLines} into {@code afterLines}, by way of an exact
     * longest-common-subsequence table filled by dynamic programming.
     *
     * @param beforeLines the lines of the before side
     * @param afterLines  the lines of the after side
     * @return the operations, in output order, covering every line of both sides exactly once
     */
    private static List<Operation> editScript(String[] beforeLines, String[] afterLines) {
        val beforeSize = beforeLines.length;
        val afterSize = afterLines.length;

        // lcs[i][j] is the length of the longest common subsequence of beforeLines[i..] and afterLines[j..].
        val lcs = new int[beforeSize + 1][afterSize + 1];
        for (var i = beforeSize - 1; i >= 0; i--) {
            for (var j = afterSize - 1; j >= 0; j--) {
                lcs[i][j] = beforeLines[i].equals(afterLines[j])
                    ? lcs[i + 1][j + 1] + 1
                    : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
            }
        }

        val operations = new ArrayList<Operation>();
        var i = 0;
        var j = 0;
        while (i < beforeSize && j < afterSize) {
            if (beforeLines[i].equals(afterLines[j])) {
                operations.add(new Operation(Kind.EQUAL, beforeLines[i], i + 1, j + 1));
                i++;
                j++;
            } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
                // Removals are emitted before additions, so a modified line reads as a - line then a + line.
                operations.add(new Operation(Kind.DELETE, beforeLines[i], i + 1, 0));
                i++;
            } else {
                operations.add(new Operation(Kind.INSERT, afterLines[j], 0, j + 1));
                j++;
            }
        }
        while (i < beforeSize) {
            operations.add(new Operation(Kind.DELETE, beforeLines[i], i + 1, 0));
            i++;
        }
        while (j < afterSize) {
            operations.add(new Operation(Kind.INSERT, afterLines[j], 0, j + 1));
            j++;
        }
        return operations;
    }

    /**
     * Group an edit script into hunks.
     * <p>
     * Each hunk covers one or more changes plus up to {@value #CONTEXT} unchanged operations on each side of them.
     * Two consecutive changes separated by at most {@code 2 × }{@value #CONTEXT} unchanged operations have context
     * windows that touch or overlap and are therefore merged into one hunk; a longer unchanged run ends the hunk.
     *
     * @param operations the edit script
     * @return one {@code {firstIndex, lastIndex}} pair per hunk, both bounds inclusive indices into
     *         {@code operations}
     */
    private static List<int[]> groupIntoHunks(List<Operation> operations) {
        val hunks = new ArrayList<int[]>();
        var cursor = 0;
        while (cursor < operations.size()) {
            if (operations.get(cursor).kind() == Kind.EQUAL) {
                cursor++;
                continue;
            }
            val firstChange = cursor;
            var lastChange = cursor;
            var scan = cursor;
            while (scan < operations.size()) {
                if (operations.get(scan).kind() != Kind.EQUAL) {
                    lastChange = scan;
                    scan++;
                    continue;
                }
                val runStart = scan;
                while (scan < operations.size() && operations.get(scan).kind() == Kind.EQUAL) {
                    scan++;
                }
                if (scan >= operations.size() || scan - runStart > 2 * CONTEXT) {
                    break;
                }
            }
            hunks.add(new int[] {
                Math.max(0, firstChange - CONTEXT),
                Math.min(operations.size() - 1, lastChange + CONTEXT)
            });
            cursor = lastChange + 1;
        }
        return hunks;
    }

    /**
     * Append one hunk — its {@code @@} header and its body lines — to the output being built.
     *
     * @param builder    the output being built
     * @param operations the whole edit script
     * @param first      the inclusive index of the hunk's first operation
     * @param last       the inclusive index of the hunk's last operation
     */
    private static void appendHunk(StringBuilder builder, List<Operation> operations, int first, int last) {
        var beforeStart = 0;
        var beforeCount = 0;
        var afterStart = 0;
        var afterCount = 0;
        for (var index = first; index <= last; index++) {
            val operation = operations.get(index);
            if (operation.kind() != Kind.INSERT) {
                beforeCount++;
                beforeStart = beforeStart == 0 ? operation.beforeLine() : beforeStart;
            }
            if (operation.kind() != Kind.DELETE) {
                afterCount++;
                afterStart = afterStart == 0 ? operation.afterLine() : afterStart;
            }
        }
        builder
            .append("@@ -")
            .append(beforeStart)
            .append(',')
            .append(beforeCount)
            .append(" +")
            .append(afterStart)
            .append(',')
            .append(afterCount)
            .append(" @@\n");
        for (var index = first; index <= last; index++) {
            val operation = operations.get(index);
            builder.append(prefix(operation.kind())).append(operation.text()).append('\n');
        }
    }

    /**
     * Resolve the single character a hunk body line is prefixed with.
     *
     * @param kind the kind of operation
     * @return the unified-diff prefix character
     */
    private static char prefix(Kind kind) {
        return switch (kind) {
            case EQUAL -> ' ';
            case DELETE -> '-';
            case INSERT -> '+';
        };
    }

    /**
     * The kind of a single edit-script operation.
     */
    private enum Kind {
        /**
         * A line present on both sides, rendered as context.
         */
        EQUAL,
        /**
         * A line present only on the before side.
         */
        DELETE,
        /**
         * A line present only on the after side.
         */
        INSERT
    }

    /**
     * One edit-script operation: a kind, the line's text, and the 1-based line number the line has on each side it
     * exists on ({@code 0} on the side it does not exist on).
     *
     * @param kind       the kind of operation
     * @param text       the line's text, without its terminating newline
     * @param beforeLine the 1-based line number on the before side, or {@code 0} for an {@link Kind#INSERT}
     * @param afterLine  the 1-based line number on the after side, or {@code 0} for a {@link Kind#DELETE}
     */
    private record Operation(Kind kind, String text, int beforeLine, int afterLine) {}
}

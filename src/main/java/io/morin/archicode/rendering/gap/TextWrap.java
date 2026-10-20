package io.morin.archicode.rendering.gap;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The layout of the text report ({@link GapReport}): its tables, and the sentences that are not in a table, optionally wrapped
 * to a number of columns (#26).
 *
 * <p>Without a width ({@link GapReport#NO_WIDTH}) the text is written as it always was: every column as wide as its longest
 * cell, two spaces between the columns, the last column as it is. With a width, a table whose lines would be longer is laid
 * out again: a cell wraps inside its column, and the row takes as many lines as its tallest cell. The width is shared like
 * water: each column keeps at least as much as its heading, and what is left goes to the narrowest columns first, up to the
 * size of their longest cell, so that the short columns (the change, the thing, the layer) are never wrapped before the long
 * ones. When even the headings do not fit, the lines are longer than the width: nothing is cut off.
 *
 * <p>A cell and a sentence wrap at the spaces. A word longer than its column (a reference of a deep element, 447 characters
 * on a real workspace, has no space) is cut after a dot, a slash or a comma, as many segments to a line as fit; a segment that
 * is still longer than the line is cut after a hyphen or an underscore, and then where the line ends. The text is not
 * changed otherwise: unwrapped, the lines read back as the cell (a space where a cell wrapped at a space; a cut inside a
 * word loses nothing).
 */
@UtilityClass
class TextWrap {

    /** The gap between two columns of a table. */
    private static final String GAP = "  ";

    /** The least room given to the value of a labelled line, however narrow the width. */
    private static final int LEAST_VALUE = 10;

    /**
     * A sentence, and its end of line.
     *
     * @param out where the sentence is written
     * @param text the sentence
     * @param width the columns it is wrapped to, or {@link GapReport#NO_WIDTH}
     */
    static void prose(StringBuilder out, String text, int width) {
        if (width <= GapReport.NO_WIDTH || text.length() <= width) {
            out.append(text).append('\n');
            return;
        }
        for (val line : wrap(text, width)) {
            out.append(line.stripTrailing()).append('\n');
        }
    }

    /**
     * A value after a label, 14 columns wide with its space (the labels of the counts at the top of the report); a value that wraps goes on under itself.
     *
     * @param out where the line is written
     * @param label the label
     * @param value the value
     * @param width the columns the line is wrapped to, or {@link GapReport#NO_WIDTH}
     */
    static void labelled(StringBuilder out, String label, String value, int width) {
        val head = String.format(Locale.ROOT, "%-13s ", label);
        if (width <= GapReport.NO_WIDTH || head.length() + value.length() <= width) {
            out.append(head).append(value).append('\n');
            return;
        }
        val lines = wrap(value, Math.max(width - head.length(), LEAST_VALUE));
        for (int i = 0; i < lines.size(); i++) {
            out.append(i == 0 ? head : " ".repeat(head.length()))
                .append(lines.get(i).stripTrailing())
                .append('\n');
        }
    }

    /**
     * A table whose first line is the headings. Every column but the last is padded and followed by two spaces; the last is
     * written as it is, and the lines do not end with a space.
     *
     * @param out where the table is written
     * @param table the rows, the headings first; all of them as many cells as the headings
     * @param width the columns the table is wrapped to, or {@link GapReport#NO_WIDTH}
     */
    static void table(StringBuilder out, List<List<String>> table, int width) {
        val columns = table.get(0).size();
        val natural = new int[columns];
        table.forEach(cells -> {
            for (int i = 0; i < columns; i++) {
                natural[i] = Math.max(natural[i], cells.get(i).length());
            }
        });
        var naturalLine = (columns - 1) * GAP.length();
        for (val w : natural) {
            naturalLine += w;
        }
        // no width, or a table that is not wider than it: the table as it always was
        val widths = width <= GapReport.NO_WIDTH || naturalLine <= width ? natural : shared(table, natural, width);
        for (val cells : table) {
            val wrapped = new ArrayList<List<String>>();
            var height = 1;
            for (int i = 0; i < columns; i++) {
                val lines = widths[i] >= cells.get(i).length() ? List.of(cells.get(i)) : wrap(cells.get(i), widths[i]);
                wrapped.add(lines);
                height = Math.max(height, lines.size());
            }
            for (int row = 0; row < height; row++) {
                val line = new StringBuilder();
                for (int i = 0; i < columns; i++) {
                    val text = row < wrapped.get(i).size() ? wrapped.get(i).get(row) : "";
                    if (i < columns - 1) {
                        line.append(String.format(Locale.ROOT, "%-" + Math.max(widths[i], 1) + "s", text)).append(GAP);
                    } else {
                        line.append(text);
                    }
                }
                out.append(line.toString().stripTrailing()).append('\n');
            }
        }
    }

    /** The width of each column of a table that does not fit: the headings first, then one column at a time, the narrowest first. */
    private static int[] shared(List<List<String>> table, int[] natural, int width) {
        val columns = natural.length;
        val widths = new int[columns];
        var left = width - (columns - 1) * GAP.length();
        for (int i = 0; i < columns; i++) {
            widths[i] = Math.min(natural[i], table.get(0).get(i).length());
            left -= widths[i];
        }
        while (left > 0) {
            var narrowest = -1;
            for (int i = 0; i < columns; i++) {
                if (widths[i] < natural[i] && (narrowest < 0 || widths[i] < widths[narrowest])) {
                    narrowest = i;
                }
            }
            if (narrowest < 0) {
                break;
            }
            widths[narrowest]++;
            left--;
        }
        return widths;
    }

    /**
     * The text in lines of at most {@code width} characters: at the spaces, and a word that is longer than a line cut after
     * a dot, a slash or a comma, then after a hyphen or an underscore, then where the line ends.
     *
     * @param text the text
     * @param width the most characters in a line, at least 1
     * @return the lines, at least one
     */
    static List<String> wrap(String text, int width) {
        val max = Math.max(width, 1);
        val lines = new ArrayList<String>();
        val line = new StringBuilder();
        var first = true;
        for (val word : text.split(" ", -1)) {
            if (word.length() > max) {
                if (line.length() > 0) {
                    lines.add(line.toString());
                    line.setLength(0);
                }
                val pieces = cut(word, max, 0);
                lines.addAll(pieces.subList(0, pieces.size() - 1));
                line.append(pieces.get(pieces.size() - 1));
            } else if (first) {
                line.append(word);
            } else if (line.length() + 1 + word.length() <= max) {
                line.append(' ').append(word);
            } else {
                lines.add(line.toString());
                line.setLength(0);
                line.append(word);
            }
            first = false;
        }
        lines.add(line.toString());
        return lines;
    }

    /**
     * The characters a long word is cut after, the first set before the second: the dots and the slashes of a reference and
     * of a path and the commas of a list, then, for what is still too long, the hyphens and the underscores of an identifier.
     */
    private static final List<String> BREAKS = List.of("./,", "-_");

    /**
     * A word longer than {@code max}, in lines: cut after the characters of the first set of {@link #BREAKS} and the segments
     * packed in lines; a segment that is still longer is cut after the characters of the next set, and, when there is none,
     * where the line ends.
     */
    private static List<String> cut(String word, int max, int level) {
        val pieces = new ArrayList<String>();
        val line = new StringBuilder();
        val breaks = level < BREAKS.size() ? BREAKS.get(level) : "";
        var start = 0;
        while (start < word.length()) {
            var end = start;
            while (end < word.length() && breaks.indexOf(word.charAt(end)) < 0) {
                end++;
            }
            // the segment includes the separator that ends it
            var segment = word.substring(start, Math.min(end + 1, word.length()));
            start += segment.length();
            if (line.length() + segment.length() <= max) {
                line.append(segment);
                continue;
            }
            if (line.length() > 0) {
                pieces.add(line.toString());
                line.setLength(0);
            }
            if (segment.length() <= max) {
                line.append(segment);
            } else if (level < BREAKS.size()) {
                val inner = cut(segment, max, level + 1);
                pieces.addAll(inner.subList(0, inner.size() - 1));
                line.append(inner.get(inner.size() - 1));
            } else {
                while (segment.length() > max) {
                    pieces.add(segment.substring(0, max));
                    segment = segment.substring(max);
                }
                line.append(segment);
            }
        }
        if (line.length() > 0) {
            pieces.add(line.toString());
        }
        return pieces;
    }
}

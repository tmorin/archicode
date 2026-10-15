package io.morin.archicode.viewpoint.kernel;

import lombok.experimental.UtilityClass;

/**
 * The label of a relationship, as the viewpoint kernel compares it: the edges are trimmed (with the Unicode
 * {@code White_Space} property, as Rust's {@code str::trim} does), and a label that is empty once trimmed is no label at
 * all ({@code null}). The kernel answers with labels in that form, so everything on the Java side that matches what it
 * answers against what a workspace declares compares labels in that form too, whatever the author wrote.
 */
@UtilityClass
public class RelationshipLabel {

    /**
     * @param label the label as declared, possibly {@code null}
     * @return the label as the kernel compares it, or {@code null} when there is none
     */
    public static String normalize(String label) {
        if (label == null) {
            return null;
        }
        var start = 0;
        var end = label.length();
        while (start < end && isWhiteSpace(label.codePointAt(start))) {
            start += Character.charCount(label.codePointAt(start));
        }
        while (end > start && isWhiteSpace(label.codePointBefore(end))) {
            end -= Character.charCount(label.codePointBefore(end));
        }
        return start == end ? null : label.substring(start, end);
    }

    /** Whether two labels are the same one for the kernel. */
    public static boolean same(String first, String second) {
        return java.util.Objects.equals(normalize(first), normalize(second));
    }

    /** The Unicode {@code White_Space} property (what Rust trims; {@link Character#isWhitespace} is not the same set). */
    private static boolean isWhiteSpace(int c) {
        return (
            (c >= 0x09 && c <= 0x0D) ||
            c == 0x20 ||
            c == 0x85 ||
            c == 0xA0 ||
            c == 0x1680 ||
            (c >= 0x2000 && c <= 0x200A) ||
            c == 0x2028 ||
            c == 0x2029 ||
            c == 0x202F ||
            c == 0x205F ||
            c == 0x3000
        );
    }
}

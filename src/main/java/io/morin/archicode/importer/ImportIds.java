package io.morin.archicode.importer;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import lombok.val;

/**
 * The id rule the importers share: a name lowercased, each run of characters outside {@code [a-z0-9_-]} one {@code _},
 * trimmed of {@code _}; a name with no letter and no digit takes a fallback chosen by the importer; siblings that collide take
 * the first suffix {@code _2}, {@code _3}, ... that no sibling holds as its own id.
 */
public final class ImportIds {

    private ImportIds() {}

    /**
     * The ids of a group of siblings.
     *
     * @param ids       the id of each sibling, in the order given
     * @param rewritten whether the id of each sibling differs from what its name asks for, beyond case
     */
    public record Assigned(List<String> ids, List<Boolean> rewritten) {}

    /**
     * The name lowercased, each run of characters outside {@code [a-z0-9_-]} one {@code _}, trimmed of {@code _}.
     *
     * @param text the name
     * @return the slug, possibly empty
     */
    public static String slug(String text) {
        val lower = text.toLowerCase(Locale.ROOT);
        val out = new StringBuilder();
        var inRun = false;
        for (var i = 0; i < lower.length(); i++) {
            val c = lower.charAt(i);
            if (isIdCharacter(c)) {
                out.append(c);
                inRun = false;
            } else if (!inRun) {
                out.append('_');
                inRun = true;
            }
        }
        var start = 0;
        var end = out.length();
        while (start < end && out.charAt(start) == '_') {
            start++;
        }
        while (end > start && out.charAt(end - 1) == '_') {
            end--;
        }
        return out.substring(start, end);
    }

    /**
     * True when a character other than an ASCII letter, a digit, {@code _} or {@code -} is replaced; a space is one of them
     * only when {@code spaceIsRewrite} is true.
     *
     * @param name           the name
     * @param spaceIsRewrite whether turning a space to {@code _} counts as a rewrite
     * @return whether a character is replaced
     */
    public static boolean rewritesCharacter(String name, boolean spaceIsRewrite) {
        for (val c : name.toLowerCase(Locale.ROOT).toCharArray()) {
            if (!isIdCharacter(c) && (spaceIsRewrite || c != ' ')) {
                return true;
            }
        }
        return false;
    }

    /**
     * True when the id holds a letter or a digit.
     *
     * @param id the id
     * @return whether it holds one
     */
    public static boolean hasAlphanumeric(String id) {
        for (val c : id.toCharArray()) {
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Give a distinct id to each sibling. Every base is taken before a suffix is chosen, so a suffix never shadows a sibling.
     *
     * @param bases     the id each sibling asks for, in the order of the export
     * @param rewritten whether each base is already a rewrite
     * @return the ids and the rewritten flags, in the same order
     */
    public static Assigned assign(List<String> bases, List<Boolean> rewritten) {
        val taken = new HashSet<>(bases);
        val used = new HashSet<String>();
        val ids = new ArrayList<String>();
        val flags = new ArrayList<Boolean>();
        for (var i = 0; i < bases.size(); i++) {
            var id = bases.get(i);
            var changed = rewritten.get(i);
            if (!used.add(id)) {
                var suffix = 2;
                while (taken.contains(id + "_" + suffix) || used.contains(id + "_" + suffix)) {
                    suffix++;
                }
                id = id + "_" + suffix;
                used.add(id);
                changed = true;
            }
            ids.add(id);
            flags.add(changed);
        }
        return new Assigned(List.copyOf(ids), List.copyOf(flags));
    }

    private static boolean isIdCharacter(char c) {
        return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-';
    }
}

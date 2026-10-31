package io.morin.archicode.workspace;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import lombok.val;

/**
 * The proof that a fold changes nothing a reader can see (wave 028, run 0208, issue #65). It is pure: it is given two
 * {@link Snapshot}s of the plateaus that remain, one taken before the fold and one taken on a temporary copy after it, and
 * returns the sentence for the first line that differs. It loads nothing and reads no file.
 */
public final class FoldCheck {

    private FoldCheck() {}

    /**
     * What a reader sees of the plateaus that remain.
     *
     * @param models      for each remaining plateau, the lines of its model: one per element and per relationship, sorted
     * @param comparisons for each ordered pair of remaining plateaus, keyed {@code P -> Q}, how they compare
     */
    public record Snapshot(Map<String, List<String>> models, Map<String, ComparisonLines> comparisons) {}

    /**
     * How a plateau compares with another, as lines.
     *
     * @param rows     the rows of the table of changes, in the order the table has them
     * @param warnings the warnings of the comparison, sorted
     * @param cascade  the rows of the cascade of removals, without the plateau and the rank
     */
    public record ComparisonLines(List<String> rows, List<String> warnings, List<String> cascade) {}

    /**
     * What was compared.
     *
     * @param plateaus    the number of plateaus that remain
     * @param comparisons the number of ordered pairs compared
     */
    public record Check(int plateaus, int comparisons) {}

    /**
     * The outcome of a fold.
     *
     * @param plan    what the fold does
     * @param check   what was compared
     * @param written whether the files were written (false for a dry run)
     */
    public record Folded(Fold.Plan plan, Check check, boolean written) {}

    /**
     * Compares two snapshots, models first (by plateau id), then the pairs (by ids).
     *
     * @param plan   what the fold does
     * @param before the snapshot of the workspace as it is
     * @param after  the snapshot of the temporary copy
     * @return the sentence of the first difference, or empty when there is none
     */
    public static Optional<String> firstDifference(Fold.Plan plan, Snapshot before, Snapshot after) {
        val prefix = "the fold of `" + plan.folded() + "` into `" + plan.into() + "` would change ";
        val suffix = ": no file is written";
        for (val id : union(before.models(), after.models())) {
            val was = before.models().getOrDefault(id, List.of());
            val now = after.models().getOrDefault(id, List.of());
            val at = firstIndex(was, now);
            if (at >= 0) {
                return Optional.of(
                    prefix +
                        "the plateau `" +
                        id +
                        "`: before the fold it has " +
                        lineOr(was, at) +
                        ", after it " +
                        lineOr(now, at) +
                        suffix
                );
            }
        }
        val empty = new ComparisonLines(List.of(), List.of(), List.of());
        for (val pair : union(before.comparisons(), after.comparisons())) {
            val was = before.comparisons().getOrDefault(pair, empty);
            val now = after.comparisons().getOrDefault(pair, empty);
            val parts = pair.split(" -> ", 2);
            val head =
                prefix +
                "how the plateau `" +
                parts[0] +
                "` compares with `" +
                (parts.length > 1 ? parts[1] : "") +
                "`: ";
            val found = firstChange(was.rows(), now.rows())
                .or(() -> firstChange(was.warnings(), now.warnings()))
                .or(() -> firstChange(was.cascade(), now.cascade()));
            if (found.isPresent()) {
                return Optional.of(head + found.get() + suffix);
            }
        }
        return Optional.empty();
    }

    private static List<String> union(Map<String, ?> one, Map<String, ?> other) {
        val keys = new TreeSet<String>(one.keySet());
        keys.addAll(other.keySet());
        return new ArrayList<>(keys);
    }

    private static int firstIndex(List<String> was, List<String> now) {
        val size = Math.max(was.size(), now.size());
        for (var i = 0; i < size; i++) {
            if (!lineOr(was, i).equals(lineOr(now, i))) {
                return i;
            }
        }
        return -1;
    }

    private static String lineOr(List<String> lines, int index) {
        return index < lines.size() ? lines.get(index) : "nothing";
    }

    private static Optional<String> firstChange(List<String> was, List<String> now) {
        val at = firstIndex(was, now);
        return at < 0 ? Optional.empty() : Optional.of(lineOr(was, at) + " becomes " + lineOr(now, at));
    }
}

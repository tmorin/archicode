package io.morin.archicode.rendering.matrix;

import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import lombok.NonNull;
import lombok.val;

/**
 * The elements of a path of plateaus as lineages: a row per lineage (followed through {@code replaces}), a cell per
 * plateau, and a Span that is one comparison of the first plateau with the last. It is plain data in and plain data out
 * (no workspace is loaded here), so the rule has unit tests on small hand-made comparisons.
 *
 * <p>The rule, in short:
 *
 * <ul>
 *   <li>the predecessors of an element of a plateau are the references it {@code replaces} that the previous plateau
 *       holds, else its own reference when the previous plateau holds it, else none;</li>
 *   <li>a row is the backward trace from a terminal element, one that no element of the next plateau names as its
 *       predecessor: a split origin is drawn in the row of each of its results, a merge is one row whose first cell lists
 *       the origins, a new element starts its row where it appears, and an element the next plateau does not hold ends
 *       its row (its next cell is {@code removed});</li>
 *   <li>the state of a cell is the state the comparison of the two consecutive plateaus gives the element;</li>
 *   <li>the Span of a row is what the comparison of the first plateau with the last gives its terminal element, {@code
 *       removed} when the row begins in the first plateau and ends before the last, and empty (null) for a transient;</li>
 *   <li>a row without any change is left out and counted in {@code unchanged}.</li>
 * </ul>
 *
 * <p>The rows are sorted (layer, reference by Unicode code point, then column), no map of the output is unsorted, nothing
 * reads the clock: the same input gives the same rows.
 *
 * @param columns the plateaus of the path, oldest first
 * @param steps the comparison of each plateau with the one on its left ({@code columns.size() - 1} of them)
 * @param spanComparison the comparison of the first plateau with the last, or null when the path has two plateaus
 * @param rows the rows that hold a change
 * @param unchanged how many rows were left out because nothing changed in them
 */
public record PlateauMatrix(
    List<Settings.Plateau> columns,
    List<Comparison> steps,
    Comparison spanComparison,
    List<Row> rows,
    int unchanged
) {
    /** The state of a cell whose row has no element in that plateau, before or at the plateau on its left. */
    public static final String ABSENT = "absent";

    /** The state of an element that did not change (also the state of the first column). */
    public static final String PRESENT = "present";

    /** The state of a cell whose row had an element in the plateau on its left and has none here. */
    public static final String REMOVED = "removed";

    /**
     * An element of a plateau.
     *
     * @param layer {@code application} or {@code technology}
     * @param reference its reference in that plateau
     * @param kind its kind
     * @param name its name
     */
    public record Node(String layer, String reference, String kind, String name) {}

    /**
     * A cell of a row.
     *
     * @param plateau the plateau of the column
     * @param state one of {@code absent}, {@code present}, {@code new}, {@code changed}, {@code removed}, {@code moved},
     *     {@code split}, {@code merged}
     * @param reference the reference of the element in that plateau, null when the row has none there
     * @param from the references it replaces
     * @param natures what changed
     */
    public record Cell(String plateau, String state, String reference, List<String> from, List<String> natures) {}

    /**
     * The Span of a row.
     *
     * @param state the state, as for a cell ({@code present} when nothing changed from the first plateau to the last)
     * @param from the references it replaces, as the comparison of the first with the last says
     * @param natures what changed over the whole path
     */
    public record Span(String state, List<String> from, List<String> natures) {}

    /**
     * A lineage.
     *
     * @param layer the layer of its terminal element
     * @param reference the reference of its terminal element
     * @param kind the kind of its terminal element
     * @param name the name of its terminal element
     * @param cells one cell per column
     * @param span its Span, null when the path has two plateaus or when the lineage is a transient
     */
    public record Row(String layer, String reference, String kind, String name, List<Cell> cells, Span span) {
        boolean changes() {
            return cells.stream().anyMatch(c -> isChange(c.state())) || (span != null && isChange(span.state()));
        }
    }

    private record Built(Row row, int column) {}

    private static final Set<String> CHANGES = Set.of("new", "changed", "removed", "moved", "split", "merged");

    private static boolean isChange(String state) {
        return CHANGES.contains(state);
    }

    private static String key(String layer, String reference) {
        return layer + "\0" + reference;
    }

    private static String state(Comparison.ElementChange change) {
        return change == null || change.change() == Change.NONE ? PRESENT : change.change().word();
    }

    /**
     * Builds the matrix.
     *
     * @param columns the plateaus of the path, oldest first, two at least
     * @param presence the elements each plateau holds, one list per column (the loaded plateau, not the union of a
     *     comparison, which leaves out what a later element replaced)
     * @param steps the comparison of each plateau with the one on its left
     * @param span the comparison of the first with the last, required with three plateaus or more and null with two
     * @return the matrix
     * @throws IllegalArgumentException when the sizes do not agree
     */
    public static PlateauMatrix of(
        @NonNull List<Settings.Plateau> columns,
        @NonNull List<List<Node>> presence,
        @NonNull List<Comparison> steps,
        Comparison span
    ) {
        val n = columns.size();
        if (n < 2 || presence.size() != n || steps.size() != n - 1 || n > 2 != (span != null)) {
            throw new IllegalArgumentException(
                "a matrix is made of two plateaus or more, their elements, one comparison per step and, from three plateaus, a span"
            );
        }
        val nodes = new ArrayList<Map<String, Node>>();
        for (val column : presence) {
            val byKey = new TreeMap<String, Node>();
            column.forEach(node -> byKey.put(key(node.layer(), node.reference()), node));
            nodes.add(byKey);
        }
        val changes = new ArrayList<Map<String, Comparison.ElementChange>>();
        steps.forEach(step -> changes.add(index(step)));
        val spanChanges = span == null ? Map.<String, Comparison.ElementChange>of() : index(span);
        // predecessors[i]: key of a node of column i -> keys of the nodes of column i-1 it stands on
        val predecessors = new ArrayList<Map<String, List<String>>>();
        predecessors.add(Map.of());
        val named = new ArrayList<Set<String>>();
        for (var i = 0; i < n; i++) {
            named.add(new HashSet<>());
        }
        for (var i = 1; i < n; i++) {
            val here = new HashMap<String, List<String>>();
            for (val node : nodes.get(i).values()) {
                val replaces = new LinkedHashSet<String>();
                val change = changes.get(i - 1).get(key(node.layer(), node.reference()));
                if (change != null) {
                    change
                        .replaces()
                        .stream()
                        .map(reference -> key(node.layer(), reference))
                        .filter(nodes.get(i - 1)::containsKey)
                        .forEach(replaces::add);
                }
                if (replaces.isEmpty() && nodes.get(i - 1).containsKey(key(node.layer(), node.reference()))) {
                    replaces.add(key(node.layer(), node.reference()));
                }
                here.put(key(node.layer(), node.reference()), List.copyOf(replaces));
                named.get(i - 1).addAll(replaces);
            }
            predecessors.add(here);
        }
        val built = new ArrayList<Built>();
        for (var i = 0; i < n; i++) {
            for (val entry : nodes.get(i).entrySet()) {
                if (!named.get(i).contains(entry.getKey())) {
                    val row = trace(
                        columns,
                        nodes,
                        changes,
                        predecessors,
                        spanChanges,
                        span != null,
                        i,
                        entry.getKey()
                    );
                    built.add(new Built(row, i));
                }
            }
        }
        built.sort(
            Comparator.<Built>comparingInt(b -> layerRank(b.row().layer()))
                .thenComparing(b -> b.row().layer())
                .thenComparing(b -> b.row().reference(), PlateauMatrix::compareCodePoints)
                .thenComparingInt(Built::column)
        );
        val kept = built.stream().map(Built::row).filter(Row::changes).toList();
        return new PlateauMatrix(List.copyOf(columns), List.copyOf(steps), span, kept, built.size() - kept.size());
    }

    private static Map<String, Comparison.ElementChange> index(Comparison comparison) {
        val out = new HashMap<String, Comparison.ElementChange>();
        comparison.getElements().forEach(e -> out.put(key(e.layer(), e.reference()), e));
        return out;
    }

    private static Row trace(
        List<Settings.Plateau> columns,
        List<Map<String, Node>> nodes,
        List<Map<String, Comparison.ElementChange>> changes,
        List<Map<String, List<String>>> predecessors,
        Map<String, Comparison.ElementChange> spanChanges,
        boolean hasSpan,
        int terminal,
        String terminalKey
    ) {
        val n = columns.size();
        val keys = new String[n];
        keys[terminal] = terminalKey;
        var first = terminal;
        while (first > 0) {
            val before = predecessors.get(first).get(keys[first]);
            if (before.size() != 1) {
                break;
            }
            keys[first - 1] = before.get(0);
            first--;
        }
        val cells = new ArrayList<Cell>();
        for (var i = 0; i < n; i++) {
            val plateau = columns.get(i).getId();
            if (keys[i] != null) {
                val change = i == 0 ? null : changes.get(i - 1).get(keys[i]);
                cells.add(
                    new Cell(
                        plateau,
                        state(change),
                        nodes.get(i).get(keys[i]).reference(),
                        change == null ? List.of() : change.replaces(),
                        change == null ? List.of() : change.natures()
                    )
                );
            } else {
                cells.add(
                    new Cell(plateau, i > 0 && keys[i - 1] != null ? REMOVED : ABSENT, null, List.of(), List.of())
                );
            }
        }
        Span span = null;
        if (hasSpan) {
            if (terminal == n - 1) {
                val change = spanChanges.get(terminalKey);
                span = new Span(
                    state(change),
                    change == null ? List.of() : change.replaces(),
                    change == null ? List.of() : change.natures()
                );
            } else if (first == 0) {
                span = new Span(REMOVED, List.of(), List.of());
            }
        }
        val node = nodes.get(terminal).get(terminalKey);
        return new Row(node.layer(), node.reference(), node.kind(), node.name(), List.copyOf(cells), span);
    }

    private static int layerRank(String layer) {
        return switch (layer) {
            case "application" -> 0;
            case "technology" -> 1;
            default -> 2;
        };
    }

    private static int compareCodePoints(String a, String b) {
        var i = 0;
        var j = 0;
        while (i < a.length() && j < b.length()) {
            val x = a.codePointAt(i);
            val y = b.codePointAt(j);
            if (x != y) {
                return Integer.compare(x, y);
            }
            i += Character.charCount(x);
            j += Character.charCount(y);
        }
        return Integer.compare(a.length() - i, b.length() - j);
    }
}

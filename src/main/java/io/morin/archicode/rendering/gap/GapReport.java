package io.morin.archicode.rendering.gap;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.core.util.Separators;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The table of changes between two plateaus, in a form a reviewer reads without opening a diagram: plain text for the
 * terminal, Markdown for a pull request, JSON for a script. The three are renderings of the same rows, the ones the
 * viewpoint kernel lists (the editor lists the same), in the same order.
 *
 * <p>The output depends on the comparison only: the same pair gives the same bytes, with {@code \n} as line ends, whatever
 * the machine. It is plain ASCII (the names of the elements are what the author wrote).
 *
 * <p>Wording-only changes (a description that was reworded and nothing else) can be left out of the listing. The counts
 * still say them: the report tells how many were left out.
 *
 * <p>An element that says what it replaces ({@code replaces}) is a {@code moved}, {@code split} or {@code merged} row, at
 * its own reference (the table stays sorted by it), and its details begin with {@code from} what it replaces (several
 * references for a merge; a split is one row per replacing element, each with the same {@code from}, and the details
 * name the others). The replaced elements have no row: they are not removed. What the comparison finds that looks like one thing said twice is listed apart, as
 * candidates that are <em>not applied</em>: the author accepts one by writing {@code replaces}. A comparison without any of
 * it is written as it always was, byte for byte: the new lines and keys exist only when there is something to say, and
 * the candidates only for a plateau that uses {@code replaces} (see {@link #listsCandidates}).
 *
 * <p>The kernel does not compare the relationships of an element that was split (which half would own them is a guess),
 * so those of the halves read as <em>new</em>. The report says it: the row of such a relationship ends with {@code of the
 * split X} (JSON: {@code of_split}) and the header counts them (see {@link #countOfSplit}). The kernel's answer is not
 * touched; this is read from its rows.
 */
@UtilityClass
public class GapReport {

    private static final int SHORT = 60;

    /**
     * @param comparison what changed
     * @param format the format
     * @param hideWording leave the wording-only changes out of the listing (and say how many)
     * @return the report, ending with a line end
     */
    public String render(@NonNull Comparison comparison, @NonNull GapFormat format, boolean hideWording) {
        return switch (format) {
            case TEXT -> text(comparison, hideWording);
            case MARKDOWN -> markdown(comparison, hideWording);
            case JSON -> json(comparison, hideWording);
        };
    }

    private static List<Comparison.Row> listed(Comparison comparison, boolean hideWording) {
        return comparison
            .getChanges()
            .stream()
            .filter(row -> !(hideWording && row.wordingOnly()))
            .toList();
    }

    private static long hidden(Comparison comparison, boolean hideWording) {
        return hideWording ? comparison.getChanges().stream().filter(Comparison.Row::wordingOnly).count() : 0;
    }

    private static String label(Settings.Plateau plateau, String fallback) {
        if (plateau == null) {
            return fallback;
        }
        return plateau.getName() == null || plateau.getName().isBlank()
            ? plateau.getId()
            : plateau.getId() + " (" + plateau.getName() + ")";
    }

    private static String counts(String name, int added, int changed, int removed) {
        return String.format(Locale.ROOT, "%-13s +%d ~%d -%d", name, added, changed, removed);
    }

    /**
     * Whether the report lists the candidates: there are some, and the plateau uses {@code replaces} (an element replaces
     * another, or a {@code replaces} was ignored and said so). A plateau that does not use it is written as it always was,
     * byte for byte; the candidates are for the author who has begun to say what replaces what, to tell what is left.
     */
    private static boolean listsCandidates(Comparison comparison) {
        val c = comparison.getCounts().elements();
        return (
            !comparison.getCandidates().isEmpty() &&
            (c.moved() + c.split() + c.merged() > 0 || !comparison.getWarnings().isEmpty())
        );
    }

    /** "1 moved, 2 split, 1 merged", or null when no element replaces another. */
    private static String replacing(Comparison.ElementCounts counts) {
        if (counts.moved() + counts.split() + counts.merged() == 0) {
            return null;
        }
        return counts.moved() + " moved, " + counts.split() + " split, " + counts.merged() + " merged";
    }

    /** The elements of the comparison that were split, as {@code layer NUL reference}. */
    private static Set<String> splitElements(Comparison comparison) {
        val out = new HashSet<String>();
        for (val element : comparison.getElements()) {
            if (element.change() == Change.SPLIT) {
                out.add(element.layer() + "\0" + element.reference());
            }
        }
        return out;
    }

    /**
     * The split elements a new relationship belongs to: its source and its destination, when they were split. The kernel
     * does not compare what a split element had (rule 6), so the relationships of the halves read as new whether the
     * element had them before the split or not; empty for any other row.
     */
    private static List<String> ofSplit(Comparison.Row row, Set<String> splits) {
        if (splits.isEmpty() || !row.thing().equals("relationship") || row.change() != Change.NEW) {
            return List.of();
        }
        val owners = new LinkedHashSet<String>();
        for (val end : new String[] { row.reference(), row.destination() }) {
            if (splits.contains(row.layer() + "\0" + end)) {
                owners.add(end);
            }
        }
        return List.copyOf(owners);
    }

    /** How many of the new relationships belong to a split element. */
    private static long countOfSplit(Comparison comparison) {
        val splits = splitElements(comparison);
        return comparison
            .getChanges()
            .stream()
            .filter(row -> !ofSplit(row, splits).isEmpty())
            .count();
    }

    // ---- text ----

    private static String text(Comparison comparison, boolean hideWording) {
        val out = new StringBuilder();
        val c = comparison.getCounts();
        out.append("comparing ")
            .append(label(comparison.getTarget(), "the plateau"))
            .append(" with ")
            .append(label(comparison.getBase(), "its baseline"))
            .append('\n');
        out.append(counts("elements", c.elements().added(), c.elements().changed(), c.elements().removed())).append(
            '\n'
        );
        if (replacing(c.elements()) != null) {
            out.append(String.format(Locale.ROOT, "%-13s %s", "replacing", replacing(c.elements()))).append('\n');
        }
        out.append(
            counts("relationships", c.relationships().added(), c.relationships().changed(), c.relationships().removed())
        ).append('\n');
        val inSplits = countOfSplit(comparison);
        if (inSplits > 0) {
            out.append(
                String.format(
                    Locale.ROOT,
                    "%-13s %d of the %d new relationships belong to split elements (not compared with the baseline)",
                    "of a split",
                    inSplits,
                    c.relationships().added()
                )
            ).append('\n');
        }
        out.append(
            String.format(
                Locale.ROOT,
                "%-13s %d of the %d changed elements",
                "wording only",
                c.elements().wordingOnly(),
                c.elements().changed()
            )
        ).append('\n');
        val hidden = hidden(comparison, hideWording);
        if (hideWording) {
            out.append(hidden)
                .append(hidden == 1 ? " wording-only change hidden" : " wording-only changes hidden")
                .append(" (--no-wording)")
                .append('\n');
        }
        val rows = listed(comparison, hideWording);
        if (rows.isEmpty()) {
            out.append('\n')
                .append(comparison.getChanges().isEmpty() ? "no difference" : "nothing to list")
                .append('\n');
            return out.toString();
        }
        val splits = splitElements(comparison);
        val table = new ArrayList<List<String>>();
        table.add(List.of("CHANGE", "THING", "LAYER", "REFERENCE", "NATURES", "DETAILS"));
        rows.forEach(row ->
            table.add(
                List.of(
                    row.change().word(),
                    row.thing(),
                    row.layer(),
                    reference(row),
                    natures(row),
                    String.join("; ", details(row, rows, splits))
                )
            )
        );
        val widths = new int[5];
        table.forEach(cells -> {
            for (int i = 0; i < widths.length; i++) {
                widths[i] = Math.max(widths[i], cells.get(i).length());
            }
        });
        out.append('\n');
        for (val cells : table) {
            val line = new StringBuilder();
            for (int i = 0; i < widths.length; i++) {
                line.append(String.format(Locale.ROOT, "%-" + widths[i] + "s  ", cells.get(i)));
            }
            line.append(cells.get(5));
            out.append(line.toString().stripTrailing()).append('\n');
        }
        textCandidates(out, comparison);
        return out.toString();
    }

    private static void textCandidates(StringBuilder out, Comparison comparison) {
        if (!listsCandidates(comparison)) {
            return;
        }
        out.append(
            "\ncandidates, not applied (each pair looks like one thing said twice; to accept one, write `replaces: [FROM]` on the element TO)\n"
        );
        val table = new ArrayList<List<String>>();
        table.add(List.of("LAYER", "FROM", "TO", "REASONS"));
        comparison
            .getCandidates()
            .forEach(candidate ->
                table.add(
                    List.of(candidate.layer(), candidate.from(), candidate.to(), String.join(", ", candidate.reasons()))
                )
            );
        val widths = new int[3];
        table.forEach(cells -> {
            for (int i = 0; i < widths.length; i++) {
                widths[i] = Math.max(widths[i], cells.get(i).length());
            }
        });
        for (val cells : table) {
            val line = new StringBuilder();
            for (int i = 0; i < widths.length; i++) {
                line.append(String.format(Locale.ROOT, "%-" + widths[i] + "s  ", cells.get(i)));
            }
            line.append(cells.get(3));
            out.append(line.toString().stripTrailing()).append('\n');
        }
    }

    // ---- markdown ----

    private static String markdown(Comparison comparison, boolean hideWording) {
        val out = new StringBuilder();
        val c = comparison.getCounts();
        out.append("# Changes of ")
            .append(cell(label(comparison.getTarget(), "the plateau")))
            .append(" compared with ")
            .append(cell(label(comparison.getBase(), "its baseline")))
            .append("\n\n");
        out.append("| | new | changed | removed |\n|---|---:|---:|---:|\n");
        out.append(
            "| elements | " +
                c.elements().added() +
                " | " +
                c.elements().changed() +
                " | " +
                c.elements().removed() +
                " |\n"
        )
            .append(
                "| relationships | " +
                    c.relationships().added() +
                    " | " +
                    c.relationships().changed() +
                    " | " +
                    c.relationships().removed() +
                    " |\n"
            )
            .append('\n');
        if (replacing(c.elements()) != null) {
            out.append("Replacing elements: ").append(replacing(c.elements())).append(".\n\n");
        }
        val inSplits = countOfSplit(comparison);
        if (inSplits > 0) {
            out.append("Of the ")
                .append(c.relationships().added())
                .append(" new relationships, ")
                .append(inSplits)
                .append(
                    inSplits == 1
                        ? " belongs to a split element: the comparison does not compare the relationships of a split element with the baseline.\n\n"
                        : " belong to split elements: the comparison does not compare the relationships of a split element with the baseline.\n\n"
                );
        }
        out.append("Wording only: ")
            .append(c.elements().wordingOnly())
            .append(" of the ")
            .append(c.elements().changed())
            .append(" changed elements.");
        if (hideWording) {
            val hidden = hidden(comparison, hideWording);
            out.append(' ')
                .append(hidden)
                .append(hidden == 1 ? " wording-only change is" : " wording-only changes are")
                .append(" hidden from the table.");
        }
        out.append("\n\n");
        val rows = listed(comparison, hideWording);
        if (rows.isEmpty()) {
            out.append(comparison.getChanges().isEmpty() ? "No difference.\n" : "Nothing to list.\n");
            return out.toString();
        }
        out.append("| Change | Thing | Layer | Reference | Natures | Details |\n|---|---|---|---|---|---|\n");
        val splits = splitElements(comparison);
        for (val row : rows) {
            out.append("| ")
                .append(row.change().word())
                .append(" | ")
                .append(row.thing())
                .append(" | ")
                .append(row.layer())
                .append(" | ")
                .append(cell(reference(row)))
                .append(" | ")
                .append(cell(natures(row)))
                .append(" | ")
                .append(cell(String.join("; ", details(row, rows, splits))))
                .append(" |\n");
        }
        markdownCandidates(out, comparison);
        return out.toString();
    }

    private static void markdownCandidates(StringBuilder out, Comparison comparison) {
        if (!listsCandidates(comparison)) {
            return;
        }
        out.append(
            "\n## Candidates, not applied\n\nEach pair looks like one thing said twice. To accept one, write `replaces: [FROM]` on the element TO.\n\n"
        );
        out.append("| Layer | From | To | Reasons |\n|---|---|---|---|\n");
        for (val candidate : comparison.getCandidates()) {
            out.append("| ")
                .append(cell(candidate.layer()))
                .append(" | ")
                .append(cell(candidate.from()))
                .append(" | ")
                .append(cell(candidate.to()))
                .append(" | ")
                .append(cell(String.join(", ", candidate.reasons())))
                .append(" |\n");
        }
    }

    /** A value in a cell of a Markdown table: no line end, no bar. */
    private static String cell(String value) {
        return value.replace("\r", "").replace("\n", " ").replace("|", "\\|");
    }

    // ---- json ----

    @SneakyThrows
    private static String json(Comparison comparison, boolean hideWording) {
        val mapper = new ObjectMapper();
        val root = mapper.createObjectNode();
        plateau(root.putObject("plateau"), comparison.getTarget());
        plateau(root.putObject("baseline"), comparison.getBase());
        val counts = root.putObject("counts");
        val c = comparison.getCounts();
        val elements = counts.putObject("elements");
        elements.put("new", c.elements().added());
        elements.put("changed", c.elements().changed());
        elements.put("removed", c.elements().removed());
        elements.put("wording_only", c.elements().wordingOnly());
        val relationships = counts.putObject("relationships");
        relationships.put("new", c.relationships().added());
        relationships.put("changed", c.relationships().changed());
        relationships.put("removed", c.relationships().removed());
        val inSplits = countOfSplit(comparison);
        if (inSplits > 0) {
            // the new relationships that belong to a split element, only when there are some
            relationships.put("of_split", inSplits);
        }
        if (replacing(c.elements()) != null) {
            // next to new, changed and removed, only when an element replaces another
            elements.put("moved", c.elements().moved());
            elements.put("split", c.elements().split());
            elements.put("merged", c.elements().merged());
        }
        root.put("hidden_wording_only", hidden(comparison, hideWording));
        val changes = root.putArray("changes");
        val splits = splitElements(comparison);
        for (val row : listed(comparison, hideWording)) {
            val node = changes.addObject();
            node.put("thing", row.thing());
            node.put("layer", row.layer());
            node.put("reference", row.reference());
            if (row.destination() != null) {
                node.put("destination", row.destination());
            }
            if (row.label() != null) {
                node.put("label", row.label());
            }
            if (row.kind() != null) {
                node.put("kind", row.kind());
            }
            if (row.name() != null) {
                node.put("name", row.name());
            }
            node.put("change", row.change().word());
            val natures = node.putArray("natures");
            row.natures().forEach(natures::add);
            node.put("wording_only", row.wordingOnly());
            if (!row.replaces().isEmpty()) {
                val replaces = node.putArray("replaces");
                row.replaces().forEach(replaces::add);
            }
            val owners = ofSplit(row, splits);
            if (!owners.isEmpty()) {
                val of = node.putArray("of_split");
                owners.forEach(of::add);
            }
            if (!row.before().isEmpty() || !row.after().isEmpty()) {
                val before = node.putObject("before");
                row.before().forEach(before::set);
                val after = node.putObject("after");
                row.after().forEach(after::set);
            }
        }
        if (listsCandidates(comparison)) {
            // not applied: the author accepts one by writing `replaces` on `to`
            val candidates = root.putArray("candidates");
            for (val candidate : comparison.getCandidates()) {
                val node = candidates.addObject();
                node.put("layer", candidate.layer());
                node.put("from", candidate.from());
                node.put("to", candidate.to());
                val reasons = node.putArray("reasons");
                candidate.reasons().forEach(reasons::add);
                node.put("applied", false);
            }
        }
        // two spaces and a line feed on every machine
        val indenter = new DefaultIndenter("  ", "\n");
        val printer = new DefaultPrettyPrinter(
            Separators.createDefaultInstance().withObjectFieldValueSpacing(Separators.Spacing.AFTER)
        )
            .withObjectIndenter(indenter)
            .withArrayIndenter(indenter);
        return mapper.writer(printer).writeValueAsString(root) + "\n";
    }

    private static void plateau(ObjectNode node, Settings.Plateau plateau) {
        if (plateau == null) {
            return;
        }
        node.put("id", plateau.getId());
        if (plateau.getName() != null) {
            node.put("name", plateau.getName());
        }
        if (plateau.getHorizon() != null) {
            node.put("horizon", plateau.getHorizon());
        }
    }

    // ---- what a row says ----

    /** The thing: the reference of an element; `source -> destination (label)` for a relationship. */
    private static String reference(Comparison.Row row) {
        if (!row.thing().equals("relationship")) {
            return row.reference();
        }
        return row.reference() + " -> " + row.destination() + (row.label() == null ? "" : " (" + row.label() + ")");
    }

    private static String natures(Comparison.Row row) {
        if (row.natures().isEmpty()) {
            return "-";
        }
        return String.join(",", row.natures()) + (row.wordingOnly() ? " (wording only)" : "");
    }

    /**
     * What changed in a changed row: each property that differs, with what it was and what it is. A new or a removed row
     * has no details (the thing is the change), but for the name of an element. An element that moved, split or merged
     * has its name, what differs from the element it replaces, and for a split the other elements that replace the same
     * one. A new relationship of a split element says {@code of the split X}.
     */
    private static List<String> details(Comparison.Row row, List<Comparison.Row> rows, Set<String> splits) {
        val details = new ArrayList<String>();
        if (!row.replaces().isEmpty()) {
            details.add("from " + String.join(", ", row.replaces()));
        }
        val owners = ofSplit(row, splits);
        if (!owners.isEmpty()) {
            details.add("of the split " + String.join(", ", owners));
        }
        if (row.change() != Change.CHANGED) {
            if (
                row.thing().equals("element") &&
                row.name() != null &&
                !row.name().isBlank() &&
                !row.before().containsKey("name")
            ) {
                details.add("name: " + quoted(row.name()));
            }
            if (row.replaces().isEmpty()) {
                return details;
            }
        }
        val keys = new LinkedHashSet<String>(row.before().keySet());
        keys.addAll(row.after().keySet());
        for (val key : keys) {
            val before = row.before().get(key);
            val after = row.after().get(key);
            details.add(key + ": " + difference(before, after));
        }
        if (row.change() == Change.SPLIT) {
            // the other elements that replace the same ones: the table is sorted by reference, the halves may be far apart
            val others = new TreeSet<String>();
            for (val other : rows) {
                if (
                    other != row &&
                    other.thing().equals("element") &&
                    other.layer().equals(row.layer()) &&
                    other.replaces().stream().anyMatch(row.replaces()::contains)
                ) {
                    others.add(other.reference());
                }
            }
            if (!others.isEmpty()) {
                details.add("split with " + String.join(", ", others));
            }
        }
        return details;
    }

    private static String difference(JsonNode before, JsonNode after) {
        val b = before == null || before.isNull() ? null : before;
        val a = after == null || after.isNull() ? null : after;
        if ((b != null && b.isArray()) || (a != null && a.isArray())) {
            val was = new TreeSet<String>();
            val is = new TreeSet<String>();
            if (b != null) {
                b.forEach(v -> was.add(v.asText()));
            }
            if (a != null) {
                a.forEach(v -> is.add(v.asText()));
            }
            return setDifference(was, is);
        }
        if ((b != null && b.isObject()) || (a != null && a.isObject())) {
            val was = new TreeMap<String, String>();
            val is = new TreeMap<String, String>();
            if (b != null) {
                b.fields().forEachRemaining(f -> was.put(f.getKey(), f.getValue().asText()));
            }
            if (a != null) {
                a.fields().forEachRemaining(f -> is.put(f.getKey(), f.getValue().asText()));
            }
            val parts = new ArrayList<String>();
            for (val key : new TreeSet<>(union(was, is))) {
                if (!was.containsKey(key)) {
                    parts.add("+" + key + "=" + is.get(key));
                } else if (!is.containsKey(key)) {
                    parts.add("-" + key);
                } else if (!was.get(key).equals(is.get(key))) {
                    parts.add(key + ": " + was.get(key) + " -> " + is.get(key));
                }
            }
            return String.join(" ", parts);
        }
        return (b == null ? "(none)" : quoted(b.asText())) + " -> " + (a == null ? "(none)" : quoted(a.asText()));
    }

    private static TreeSet<String> union(TreeMap<String, String> a, TreeMap<String, String> b) {
        val keys = new TreeSet<String>(a.keySet());
        keys.addAll(b.keySet());
        return keys;
    }

    private static String setDifference(TreeSet<String> was, TreeSet<String> is) {
        val parts = new ArrayList<String>();
        is.stream()
            .filter(v -> !was.contains(v))
            .forEach(v -> parts.add("+" + v));
        was.stream()
            .filter(v -> !is.contains(v))
            .forEach(v -> parts.add("-" + v));
        return String.join(" ", parts);
    }

    /** A text on one line, between quotes, cut when it is long. */
    private static String quoted(String text) {
        val oneLine = text.replaceAll("\\s+", " ").strip();
        return "\"" + (oneLine.length() > SHORT ? oneLine.substring(0, SHORT - 3) + "..." : oneLine) + "\"";
    }
}

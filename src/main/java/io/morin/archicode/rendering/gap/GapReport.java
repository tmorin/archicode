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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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
        out.append(
            counts("relationships", c.relationships().added(), c.relationships().changed(), c.relationships().removed())
        ).append('\n');
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
                    String.join("; ", details(row))
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
        return out.toString();
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
                .append(cell(String.join("; ", details(row))))
                .append(" |\n");
        }
        return out.toString();
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
        root.put("hidden_wording_only", hidden(comparison, hideWording));
        val changes = root.putArray("changes");
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
            if (!row.before().isEmpty() || !row.after().isEmpty()) {
                val before = node.putObject("before");
                row.before().forEach(before::set);
                val after = node.putObject("after");
                row.after().forEach(after::set);
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
     * has no details (the thing is the change), but for the name of an element.
     */
    private static List<String> details(Comparison.Row row) {
        val details = new ArrayList<String>();
        if (row.change() != Change.CHANGED) {
            if (row.thing().equals("element") && row.name() != null && !row.name().isBlank()) {
                details.add("name: " + quoted(row.name()));
            }
            return details;
        }
        val keys = new LinkedHashSet<String>(row.before().keySet());
        keys.addAll(row.after().keySet());
        for (val key : keys) {
            val before = row.before().get(key);
            val after = row.after().get(key);
            details.add(key + ": " + difference(before, after));
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

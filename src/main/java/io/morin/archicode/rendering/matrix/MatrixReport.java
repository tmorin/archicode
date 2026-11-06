package io.morin.archicode.rendering.matrix;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.core.util.Separators;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.kernel.Comparison;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The matrix of a path of plateaus in a form a reader opens without a tool: plain text for the terminal, Markdown for a
 * pull request, JSON for a script or the page. The three are renderings of the same rows of a {@link PlateauMatrix}.
 *
 * <p>The output depends on the matrix only: the same input gives the same bytes, with {@code \n} as line ends, no clock
 * and no absolute path. The words of a text cell are {@code -} (absent), {@code =} (present), {@code new}, {@code
 * changed}, {@code removed}, {@code moved from a}, {@code split from a} and {@code merged from a, b}.
 */
@UtilityClass
public class MatrixReport {

    /**
     * @param matrix what to write
     * @param format the format
     * @return the report, ending with a line end
     */
    public String render(@NonNull PlateauMatrix matrix, @NonNull GapFormat format) {
        return switch (format) {
            case TEXT -> text(matrix);
            case MARKDOWN -> markdown(matrix);
            case JSON -> json(matrix);
        };
    }

    /** The word of a cell or of a Span in the text and the Markdown tables. */
    static String word(String state, List<String> from) {
        return switch (state) {
            case PlateauMatrix.ABSENT -> "-";
            case PlateauMatrix.PRESENT -> "=";
            case "moved", "split", "merged" -> from.isEmpty() ? state : state + " from " + String.join(", ", from);
            default -> state;
        };
    }

    private static String spanWord(PlateauMatrix.Span span) {
        return span == null ? "-" : word(span.state(), span.from());
    }

    private static String title(PlateauMatrix matrix) {
        return String.join(", ", matrix.columns().stream().map(Settings.Plateau::getId).toList());
    }

    private static String counts(Comparison.Counts c) {
        val out = new StringBuilder(
            String.format(
                Locale.ROOT,
                "elements +%d ~%d -%d, relationships +%d ~%d -%d",
                c.elements().added(),
                c.elements().changed(),
                c.elements().removed(),
                c.relationships().added(),
                c.relationships().changed(),
                c.relationships().removed()
            )
        );
        val e = c.elements();
        if (e.moved() + e.split() + e.merged() > 0) {
            out.append(
                String.format(
                    Locale.ROOT,
                    ", replacing %d moved, %d split, %d merged",
                    e.moved(),
                    e.split(),
                    e.merged()
                )
            );
        }
        return out.toString();
    }

    /** The counts of each pair, then of the Span: {@code from -> to: ...}. */
    private static List<String> countLines(PlateauMatrix matrix) {
        val lines = new ArrayList<String>();
        for (var i = 0; i < matrix.steps().size(); i++) {
            lines.add(
                matrix.columns().get(i).getId() +
                    " -> " +
                    matrix
                        .columns()
                        .get(i + 1)
                        .getId() +
                    ": " +
                    counts(matrix.steps().get(i).getCounts())
            );
        }
        if (matrix.spanComparison() != null) {
            lines.add(
                "span " +
                    matrix.columns().getFirst().getId() +
                    " -> " +
                    matrix.columns().getLast().getId() +
                    ": " +
                    counts(matrix.spanComparison().getCounts())
            );
        }
        return lines;
    }

    private static String left(PlateauMatrix matrix) {
        val n = matrix.unchanged();
        return n == 1
            ? "1 row without a change is left out"
            : String.format(Locale.ROOT, "%d rows without a change are left out", n);
    }

    private static List<String> header(PlateauMatrix matrix) {
        val head = new ArrayList<String>(List.of("LAYER", "REFERENCE", "KIND"));
        matrix.columns().forEach(c -> head.add(c.getId()));
        if (matrix.spanComparison() != null) {
            head.add("SPAN");
        }
        return head;
    }

    private static List<String> line(PlateauMatrix.Row row, boolean withSpan) {
        val cells = new ArrayList<String>(List.of(row.layer(), row.reference(), row.kind() == null ? "" : row.kind()));
        row.cells().forEach(c -> cells.add(word(c.state(), c.from())));
        if (withSpan) {
            cells.add(spanWord(row.span()));
        }
        return cells;
    }

    private static String text(PlateauMatrix matrix) {
        val out = new StringBuilder("matrix of ").append(title(matrix)).append('\n');
        countLines(matrix).forEach(l -> out.append(l).append('\n'));
        val withSpan = matrix.spanComparison() != null;
        if (!matrix.rows().isEmpty()) {
            val table = new ArrayList<List<String>>();
            table.add(header(matrix));
            matrix.rows().forEach(row -> table.add(line(row, withSpan)));
            val widths = new int[table.getFirst().size()];
            table.forEach(r -> {
                for (var i = 0; i < r.size(); i++) {
                    widths[i] = Math.max(widths[i], r.get(i).length());
                }
            });
            out.append('\n');
            for (val r : table) {
                val sb = new StringBuilder();
                for (var i = 0; i < r.size(); i++) {
                    sb.append(r.get(i));
                    if (i < r.size() - 1) {
                        sb.append(" ".repeat(widths[i] - r.get(i).length())).append("  ");
                    }
                }
                out.append(sb).append('\n');
            }
        }
        out.append('\n').append(left(matrix)).append('\n');
        return out.toString();
    }

    private static String cell(String value) {
        return value.replace("|", "\\|");
    }

    private static void markdownRow(StringBuilder out, List<String> cells) {
        out.append('|');
        cells.forEach(c -> out.append(' ').append(cell(c)).append(" |"));
        out.append('\n');
    }

    private static String markdown(PlateauMatrix matrix) {
        val out = new StringBuilder("# Matrix of ").append(title(matrix)).append("\n\n");
        countLines(matrix).forEach(l -> out.append("- ").append(l).append('\n'));
        val withSpan = matrix.spanComparison() != null;
        if (!matrix.rows().isEmpty()) {
            out.append('\n');
            val head = header(matrix);
            markdownRow(out, head);
            markdownRow(
                out,
                head
                    .stream()
                    .map(h -> "---")
                    .toList()
            );
            matrix.rows().forEach(row -> markdownRow(out, line(row, withSpan)));
        }
        out.append('\n').append(left(matrix)).append('\n');
        return out.toString();
    }

    @SneakyThrows
    private static String json(PlateauMatrix matrix) {
        val mapper = new ObjectMapper();
        val root = mapper.createObjectNode();
        val path = root.putArray("path");
        matrix.columns().forEach(c -> path.add(c.getId()));
        val columns = root.putArray("columns");
        for (val c : matrix.columns()) {
            val node = columns.addObject();
            node.put("plateau", c.getId());
            node.put("name", c.getName());
            node.put("horizon", c.getHorizon());
        }
        if (matrix.spanComparison() == null) {
            root.putNull("span");
        } else {
            val span = root.putObject("span");
            span.put("from", matrix.columns().getFirst().getId());
            span.put("to", matrix.columns().getLast().getId());
            val c = matrix.spanComparison().getCounts();
            val counts = span.putObject("counts");
            val elements = counts.putObject("elements");
            elements.put("new", c.elements().added());
            elements.put("changed", c.elements().changed());
            elements.put("removed", c.elements().removed());
            elements.put("moved", c.elements().moved());
            elements.put("split", c.elements().split());
            elements.put("merged", c.elements().merged());
            val relationships = counts.putObject("relationships");
            relationships.put("new", c.relationships().added());
            relationships.put("changed", c.relationships().changed());
            relationships.put("removed", c.relationships().removed());
        }
        val rows = root.putArray("rows");
        for (val row : matrix.rows()) {
            val node = rows.addObject();
            node.put("layer", row.layer());
            node.put("reference", row.reference());
            node.put("kind", row.kind());
            node.put("name", row.name());
            val cells = node.putArray("cells");
            for (val c : row.cells()) {
                val cn = cells.addObject();
                cn.put("plateau", c.plateau());
                cn.put("state", c.state());
                if (c.reference() != null) {
                    cn.put("reference", c.reference());
                }
                strings(cn, "from", c.from());
                strings(cn, "natures", c.natures());
            }
            if (row.span() == null) {
                node.putNull("span");
            } else {
                val sn = node.putObject("span");
                sn.put("state", row.span().state());
                strings(sn, "from", row.span().from());
                strings(sn, "natures", row.span().natures());
            }
        }
        root.put("unchanged", matrix.unchanged());
        // two spaces and a line feed on every machine, as the table of one pair
        val indenter = new DefaultIndenter("  ", "\n");
        val printer = new DefaultPrettyPrinter(
            Separators.createDefaultInstance().withObjectFieldValueSpacing(Separators.Spacing.AFTER)
        )
            .withObjectIndenter(indenter)
            .withArrayIndenter(indenter);
        return mapper.writer(printer).writeValueAsString(root) + "\n";
    }

    private static void strings(ObjectNode node, String field, List<String> values) {
        val array = node.putArray(field);
        values.forEach(array::add);
    }
}

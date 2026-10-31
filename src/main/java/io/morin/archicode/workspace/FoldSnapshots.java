package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.gap.GapReport;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import lombok.val;

/**
 * Takes the {@link FoldCheck.Snapshot} of the plateaus of a workspace that remain after a fold (wave 028, run 0208, DEC-4):
 * the model of each plateau as canonical lines, and how each plateau compares with each other one. The loader and the
 * comparer are the ones every command uses; this class only turns what they give into lines that a person can read in a
 * sentence.
 */
@RequiredArgsConstructor
final class FoldSnapshots {

    private final ObjectMapper json;
    private final PlateauComparer comparer;

    /**
     * Takes the snapshot of the plateaus listed.
     *
     * @param plateaus the plateaus that remain, sorted
     * @param load     loads a plateau (the loader's own exception stops the snapshot)
     * @param copy     whether the workspace is the temporary copy: a comparison that fails there is a line of the snapshot (so
     *                 that it is a difference), where on the original it is the loader's own sentence
     * @return the models and the comparisons
     */
    FoldCheck.Snapshot take(List<String> plateaus, Function<String, Workspace> load, boolean copy) {
        val loaded = new LinkedHashMap<String, Workspace>();
        for (val id : plateaus) {
            loaded.put(id, load.apply(id));
        }
        val models = new LinkedHashMap<String, List<String>>();
        loaded.forEach((id, workspace) -> models.put(id, modelOf(workspace)));
        val comparisons = new LinkedHashMap<String, FoldCheck.ComparisonLines>();
        for (val target : plateaus) {
            for (val base : plateaus) {
                if (!target.equals(base)) {
                    comparisons.put(target + " -> " + base, compare(loaded.get(base), loaded.get(target), copy));
                }
            }
        }
        return new FoldCheck.Snapshot(models, comparisons);
    }

    private FoldCheck.ComparisonLines compare(Workspace base, Workspace target, boolean copy) {
        try {
            val comparison = comparer.compare(base, target);
            val rows = new ArrayList<String>();
            comparison.getChanges().forEach(row -> rows.add(rowOf(row)));
            // the whole table too, for what the rows above do not say (the counts, the candidates, the identity)
            rows.add(
                "the table " +
                    GapReport.render(comparison, GapFormat.JSON, false, List.of()).replaceAll("\\s+", " ").strip()
            );
            val warnings = comparison.getWarnings().stream().sorted().toList();
            val cascade = Removal.cascade(target.getRemovals(), base).stream().map(FoldSnapshots::cascadeLine).toList();
            return new FoldCheck.ComparisonLines(List.copyOf(rows), warnings, cascade);
        } catch (ArchiCodeException e) {
            if (!copy) {
                throw e;
            }
            return new FoldCheck.ComparisonLines(
                List.of("it cannot be compared: " + e.getMessage()),
                List.of(),
                List.of()
            );
        }
    }

    /** A row of the table of changes as one line. */
    private static String rowOf(Comparison.Row row) {
        val line = new StringBuilder(row.thing()).append(' ').append(row.layer()).append(' ').append(row.reference());
        if (row.destination() != null) {
            line.append(" -> ").append(row.destination());
        }
        if (row.label() != null) {
            line.append(" (").append(row.label()).append(')');
        }
        line.append(": ").append(row.change().word());
        if (!row.natures().isEmpty()) {
            line.append(" [").append(String.join(", ", row.natures())).append(']');
        }
        if (row.wordingOnly()) {
            line.append(" (wording only)");
        }
        if (!row.replaces().isEmpty()) {
            line.append(" replaces ").append(String.join(", ", row.replaces()));
        }
        return line.toString();
    }

    /** A row of the cascade, without the plateau and the rank: those are the columns a fold changes by design. */
    private static String cascadeLine(Removal.Effect effect) {
        return (
            effect.patch() +
            ": " +
            effect.effect() +
            " " +
            effect.layer() +
            " " +
            effect.element() +
            (effect.detail().isEmpty() ? "" : " " + effect.detail())
        );
    }

    /** One line per element and per relationship of the plateau, sorted. */
    private List<String> modelOf(Workspace workspace) {
        val lines = new ArrayList<String>();
        add(lines, "application", workspace.appIndex);
        add(lines, "technology", workspace.techIndex);
        lines.sort(Comparator.naturalOrder());
        return List.copyOf(lines);
    }

    private void add(List<String> lines, String layer, ElementIndex index) {
        index.elementByReferenceIndex.forEach((reference, element) -> {
            val tree = canonical(json.valueToTree(element));
            tree.remove("elements");
            tree.remove("relationships");
            // `replaces` names elements of the plateau below, and a fold changes that plateau by design (an entry that named an
            // element of the folded plateau names what that element replaced); it is read by `compare` only, so the comparisons
            // of every pair of plateaus judge it: a moved, split or merged row, or the warning of an entry that names nothing
            tree.remove("replaces");
            lines.add(layer + " element " + reference + " " + tree);
            relationships(element).forEach(relationship ->
                lines.add(
                    layer +
                        " relationship " +
                        reference +
                        " -> " +
                        relationship.path("destination").asText() +
                        " " +
                        relationship
                )
            );
        });
    }

    private List<ObjectNode> relationships(Element element) {
        val out = new ArrayList<ObjectNode>();
        if (element.getRelationships() != null) {
            element.getRelationships().forEach(r -> out.add(canonical(json.valueToTree(r))));
        }
        return out;
    }

    /** The node with its keys sorted and its arrays sorted by their text: every collection of the model is a set or a map. */
    private static ObjectNode canonical(JsonNode node) {
        return (ObjectNode) sorted(node);
    }

    private static JsonNode sorted(JsonNode node) {
        if (node.isObject()) {
            val out = JsonNodeFactory.instance.objectNode();
            val names = new ArrayList<String>();
            node.fieldNames().forEachRemaining(names::add);
            names.sort(Comparator.naturalOrder());
            names.forEach(name -> out.set(name, sorted(node.get(name))));
            return out;
        }
        if (node.isArray()) {
            val items = new ArrayList<JsonNode>();
            node.forEach(item -> items.add(sorted(item)));
            items.sort(Comparator.comparing(JsonNode::toString));
            ArrayNode out = JsonNodeFactory.instance.arrayNode();
            items.forEach(out::add);
            return out;
        }
        return node;
    }
}

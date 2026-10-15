package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The JSON of the workspace of a comparison, as a facet reads it. A facet is a JSONPath over the JSON of the workspace
 * (see {@code apply_facet} in the viewpoint kernel); for a comparison, every element and every relationship of that JSON
 * also says what changed, in a {@code change} field ({@code none}, {@code new}, {@code changed}, {@code removed}), so that
 * a path can select on it like on a label: {@code $..relationships[?(@.change=='removed')]}. The relationships that only
 * the baseline had are added to the elements that declare them, as the elements that only it had are in the workspace,
 * so that a facet sees the whole union.
 *
 * <p>The field is the kernel's own word, and goes away before the facet's answer is read back as a workspace.
 */
@UtilityClass
class ComparisonDocument {

    private static final String CHANGE = "change";

    /**
     * Put {@code change} in the elements and the relationships of {@code workspace}, and add the removed relationships.
     *
     * @param workspace the JSON of the workspace of the union (its elements are those of the target and the removed ones)
     * @param comparison what changed
     */
    void inject(ObjectNode workspace, Comparison comparison) {
        val elements = new HashMap<String, Change>();
        comparison.getElements().forEach(e -> elements.put(e.layer() + "\0" + e.reference(), e.change()));
        val relationships = new HashMap<String, List<Comparison.RelationshipChange>>();
        comparison
            .getRelationships()
            .forEach(r -> relationships.computeIfAbsent(r.layer() + "\0" + r.from(), k -> new ArrayList<>()).add(r));
        for (val layer : List.of("application", "technology")) {
            injectElements(workspace.path(layer), layer, null, elements, relationships);
        }
    }

    /** Take {@code change} out of the elements and the relationships again. */
    void strip(JsonNode workspace) {
        for (val layer : List.of("application", "technology")) {
            stripElements(workspace.path(layer));
        }
    }

    private static void injectElements(
        JsonNode container,
        String layer,
        String parent,
        Map<String, Change> elements,
        Map<String, List<Comparison.RelationshipChange>> relationships
    ) {
        for (val node : container.path("elements")) {
            val element = (ObjectNode) node;
            val reference = parent == null ? element.path("id").asText() : parent + "." + element.path("id").asText();
            element.put(CHANGE, elements.getOrDefault(layer + "\0" + reference, Change.NONE).word());
            val union = relationships.getOrDefault(layer + "\0" + reference, List.of());
            val declared = new HashSet<String>();
            if (element.has("relationships")) {
                for (val rel : element.path("relationships")) {
                    val key = key(
                        rel.path("destination").asText(),
                        text(rel, "label"),
                        rel.path("qualifiers"),
                        rel.path("tags")
                    );
                    declared.add(key);
                    ((ObjectNode) rel).put(
                        CHANGE,
                        union
                            .stream()
                            .filter(u -> key(u).equals(key))
                            .map(Comparison.RelationshipChange::change)
                            .findFirst()
                            .orElse(Change.NONE)
                            .word()
                    );
                }
            }
            for (val removed : union) {
                if (removed.change() == Change.REMOVED && !declared.contains(key(removed))) {
                    val rel = (
                        element.has("relationships")
                            ? (ArrayNode) element.get("relationships")
                            : element.putArray("relationships")
                    ).addObject();
                    rel.put("destination", removed.destination());
                    if (removed.label() != null) {
                        rel.put("label", removed.label());
                    }
                    if (!removed.qualifiers().isEmpty()) {
                        val qualifiers = rel.putArray("qualifiers");
                        removed.qualifiers().forEach(qualifiers::add);
                    }
                    if (!removed.tags().isEmpty()) {
                        val tags = rel.putObject("tags");
                        removed.tags().forEach(tags::put);
                    }
                    rel.put(CHANGE, Change.REMOVED.word());
                }
            }
            injectElements(element, layer, reference, elements, relationships);
        }
    }

    private static void stripElements(JsonNode container) {
        for (val node : container.path("elements")) {
            val element = (ObjectNode) node;
            element.remove(CHANGE);
            for (val rel : element.path("relationships")) {
                ((ObjectNode) rel).remove(CHANGE);
            }
            stripElements(element);
        }
    }

    /** What makes two relationships of an element the same one: its destination, label, qualifiers and tags. */
    private static String key(Comparison.RelationshipChange rel) {
        val qualifiers = new TreeSet<>(rel.qualifiers());
        return String.join(
            "\0",
            rel.destination(),
            String.valueOf(rel.label()),
            qualifiers.toString(),
            new TreeMap<>(rel.tags()).toString()
        );
    }

    private static String key(String destination, String label, JsonNode qualifiers, JsonNode tags) {
        val sortedQualifiers = new TreeSet<String>();
        qualifiers.forEach(q -> sortedQualifiers.add(q.asText()));
        val sortedTags = new TreeMap<String, String>();
        tags.fields().forEachRemaining(t -> sortedTags.put(t.getKey(), t.getValue().asText()));
        return String.join(
            "\0",
            destination,
            String.valueOf(label),
            sortedQualifiers.toString(),
            sortedTags.toString()
        );
    }

    private static String text(JsonNode node, String field) {
        val value = node.path(field);
        return value.isMissingNode() || value.isNull() || value.asText().isEmpty() ? null : value.asText();
    }
}

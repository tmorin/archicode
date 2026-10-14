package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Change;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NonNull;
import lombok.Value;
import lombok.experimental.FieldDefaults;
import lombok.val;

/**
 * What the viewpoint kernel says of two plateaus: the answer of {@code compare}, read once. The words are the kernel's
 * (see {@code src/main/rust/viewpoint-kernel/README.md}, "Comparing two plateaus").
 *
 * <ul>
 *   <li>{@link #getElements()} and {@link #getRelationships()}: the union of the two plateaus, everything the target has
 *       and what only the base has, each with its {@link Change};</li>
 *   <li>{@link #getChanges()}: the table of changes, one row per element or relationship that is new, changed or removed,
 *       sorted and the same bytes for the same pair;</li>
 *   <li>{@link #getCounts()}: the header of the report.</li>
 * </ul>
 *
 * It is also what views of a comparison are made from: {@link KernelViewpointFactory} hands the union to the kernel.
 */
@Value
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class Comparison {

    /** An element of the union. {@code layer} is {@code application} or {@code technology}. */
    public record ElementChange(
        String layer,
        String reference,
        Change change,
        List<String> natures,
        boolean wordingOnly
    ) {}

    /** A relationship of the union, keyed (layer, from, destination, label). */
    public record RelationshipChange(
        String layer,
        String from,
        String destination,
        String label,
        List<String> qualifiers,
        Map<String, String> tags,
        Change change,
        List<String> natures
    ) {}

    /**
     * A row of the table. {@code thing} is {@code element} or {@code relationship}; {@code reference} is the source for a
     * relationship; {@code kind} and {@code name} are for an element; {@code destination} and {@code label} for a
     * relationship. {@code before} and {@code after} hold the properties that differ, for a changed row.
     */
    public record Row(
        String thing,
        String layer,
        String reference,
        String destination,
        String label,
        String kind,
        String name,
        Change change,
        List<String> natures,
        boolean wordingOnly,
        Map<String, JsonNode> before,
        Map<String, JsonNode> after
    ) {}

    /** {@code added} is what the kernel calls {@code new}. {@code wordingOnly} is a part of {@code changed}. */
    public record ElementCounts(int added, int changed, int removed, int wordingOnly) {}

    /** {@code added} is what the kernel calls {@code new}. */
    public record RelationshipCounts(int added, int changed, int removed) {}

    public record Counts(ElementCounts elements, RelationshipCounts relationships) {}

    List<ElementChange> elements;
    List<RelationshipChange> relationships;
    List<Row> changes;
    Counts counts;

    /** The elements of each layer as {@code compute} takes them: the union element, its relationships nested. */
    @Getter(AccessLevel.NONE)
    Map<String, ArrayNode> unionByLayer;

    /**
     * Reads the answer of the kernel.
     *
     * @param answer the JSON the kernel gave
     * @return the comparison
     * @throws ArchiCodeException when the kernel reported an error or speaks another version
     */
    static Comparison of(@NonNull JsonNode answer) {
        if (answer.has("error")) {
            throw new ArchiCodeException("%s", answer.get("error").asText());
        }
        if (answer.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, expected %s",
                answer.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }
        val elements = new ArrayList<ElementChange>();
        val unionByLayer = new TreeMap<String, ArrayNode>();
        // the relationships of the union, by the element that declares them
        val declared = new LinkedHashMap<String, ArrayNode>();
        val relationships = new ArrayList<RelationshipChange>();
        for (val rel : answer.path("relationships")) {
            relationships.add(
                new RelationshipChange(
                    rel.path("layer").asText(),
                    rel.path("from").asText(),
                    rel.path("destination").asText(),
                    rel.path("label").isNull() ? null : rel.path("label").asText(),
                    strings(rel.path("qualifiers")),
                    tags(rel.path("tags")),
                    Change.of(rel.path("change").asText()),
                    strings(rel.path("natures"))
                )
            );
            declared
                .computeIfAbsent(rel.path("layer").asText() + "\0" + rel.path("from").asText(), k ->
                    JsonNodeFactory.instance.arrayNode()
                )
                .add(rel);
        }
        for (val element : answer.path("elements")) {
            val layer = element.path("layer").asText();
            elements.add(
                new ElementChange(
                    layer,
                    element.path("reference").asText(),
                    Change.of(element.path("change").asText()),
                    strings(element.path("natures")),
                    element.path("wording_only").asBoolean(false)
                )
            );
            val union = (ObjectNode) element.deepCopy();
            union.set(
                "relationships",
                declared.getOrDefault(
                    layer + "\0" + element.path("reference").asText(),
                    JsonNodeFactory.instance.arrayNode()
                )
            );
            unionByLayer.computeIfAbsent(layer, k -> JsonNodeFactory.instance.arrayNode()).add(union);
        }
        val changes = new ArrayList<Row>();
        for (val row : answer.path("changes")) {
            changes.add(
                new Row(
                    row.path("thing").asText(),
                    row.path("layer").asText(),
                    row.path("reference").asText(),
                    text(row, "destination"),
                    text(row, "label"),
                    text(row, "kind"),
                    text(row, "name"),
                    Change.of(row.path("change").asText()),
                    strings(row.path("natures")),
                    row.path("wording_only").asBoolean(false),
                    properties(row.path("before")),
                    properties(row.path("after"))
                )
            );
        }
        val counts = answer.path("counts");
        val elementCounts = counts.path("elements");
        val relationshipCounts = counts.path("relationships");
        return new Comparison(
            List.copyOf(elements),
            List.copyOf(relationships),
            List.copyOf(changes),
            new Counts(
                new ElementCounts(
                    elementCounts.path("new").asInt(),
                    elementCounts.path("changed").asInt(),
                    elementCounts.path("removed").asInt(),
                    elementCounts.path("wording_only").asInt()
                ),
                new RelationshipCounts(
                    relationshipCounts.path("new").asInt(),
                    relationshipCounts.path("changed").asInt(),
                    relationshipCounts.path("removed").asInt()
                )
            ),
            unionByLayer
        );
    }

    /**
     * The elements of a layer as {@code compute} takes them, relationships included, removed ones too. Shared, never
     * modified: it goes into the input of the kernel as it is.
     */
    ArrayNode unionElements(@NonNull View.Layer layer) {
        return unionByLayer.getOrDefault(
            layer == View.Layer.APPLICATION ? "application" : "technology",
            JsonNodeFactory.instance.arrayNode()
        );
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).isMissingNode() || node.path(field).isNull() ? null : node.path(field).asText();
    }

    private static List<String> strings(JsonNode list) {
        val out = new ArrayList<String>();
        list.forEach(item -> out.add(item.asText()));
        return List.copyOf(out);
    }

    private static Map<String, String> tags(JsonNode tags) {
        val out = new LinkedHashMap<String, String>();
        tags.fields().forEachRemaining(e -> out.put(e.getKey(), e.getValue().asText()));
        return Collections.unmodifiableMap(out);
    }

    private static Map<String, JsonNode> properties(JsonNode properties) {
        val out = new LinkedHashMap<String, JsonNode>();
        properties.fields().forEachRemaining(e -> out.put(e.getKey(), e.getValue().deepCopy()));
        return Collections.unmodifiableMap(out);
    }
}

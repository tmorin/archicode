package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.workspace.ElementIndex;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The {@code links} property of a Map view (wave 026, run 0197, issue #143): each entry names a relationship by its source,
 * its destination and optionally its label. This class reads the shape of the entries and tells whether an entry names a
 * relationship of an index; the match that decides what is drawn is the kernel's.
 */
@UtilityClass
public class MapLinks {

    /** The key of the property, in the properties of a view and in the input of the kernel. */
    public static final String KEY = "links";

    /** The key of the highlight (wave 026, run 0198, issue #143): entries of the same shape, which mark links and add none. */
    public static final String HIGHLIGHT = "highlight";

    private static final Set<String> KEYS = Set.of("source", "destination", "label");

    /**
     * The entries of the {@code links} of a view, each checked for its shape.
     *
     * @param properties the properties of the view, possibly {@code null}
     * @param viewId     how the error names the view
     * @return the entries, in the order of the manifest
     * @throws ArchiCodeException for an entry that is not a mapping with {@code source}, {@code destination} and optionally {@code label}
     */
    public static List<JsonNode> entries(JsonNode properties, String viewId) {
        return entries(properties, viewId, KEY);
    }

    /**
     * The entries of the list under {@code key} ({@code links} or {@code highlight}), each checked for its shape.
     *
     * @param key the key whose list is read, which the error sentence names
     */
    public static List<JsonNode> entries(JsonNode properties, String viewId, String key) {
        val entries = new ArrayList<JsonNode>();
        if (properties == null) {
            return entries;
        }
        val list = properties.path(key);
        for (var i = 0; i < list.size(); i++) {
            val entry = list.get(i);
            if (!hasShape(entry)) {
                throw new ArchiCodeException(
                    "the view %s: `%s[%d]` is a mapping with `source`, `destination` and optionally `label`, and %s is not one",
                    viewId,
                    key,
                    i,
                    entry
                );
            }
            entries.add(entry);
        }
        return entries;
    }

    /**
     * The entries that have the shape, for a host that only wants to ask whether they exist; an entry of another shape is
     * left to {@link #entries} to refuse.
     */
    public static List<JsonNode> wellFormed(JsonNode properties) {
        return wellFormed(properties, KEY);
    }

    /** As above, for the list under {@code key}. */
    public static List<JsonNode> wellFormed(JsonNode properties, String key) {
        val entries = new ArrayList<JsonNode>();
        if (properties != null) {
            properties.path(key).forEach(entry -> {
                if (hasShape(entry)) {
                    entries.add(entry);
                }
            });
        }
        return entries;
    }

    /** Whether the entry names a relationship that its source declares in the index (the label compared as the kernel does). */
    public static boolean exists(ElementIndex index, JsonNode entry) {
        val label = entry.path("label").isTextual() ? entry.get("label").asText() : null;
        val destination = entry.get("destination").asText();
        return Optional.ofNullable(index.searchElement(entry.get("source").asText()).orElse(null))
            .map(element -> Optional.ofNullable(element.getRelationships()).orElseGet(Set::of))
            .map(relationships -> relationships.stream().anyMatch(candidate -> names(candidate, destination, label)))
            .orElse(false);
    }

    /**
     * Whether the entry names a relationship of the union of a comparison: one of the plateau drawn or one that only the plateau
     * compared with had (a removed relationship can be named, DEC-6 (e)).
     */
    public static boolean existsInUnion(Comparison comparison, JsonNode entry) {
        val label = entry.path("label").isTextual() ? entry.get("label").asText() : null;
        for (val element : comparison.unionElements(View.Layer.APPLICATION)) {
            if (!element.path("reference").asText().equals(entry.get("source").asText())) {
                continue;
            }
            for (val relationship : element.path("relationships")) {
                if (
                    relationship.path("destination").asText().equals(entry.get("destination").asText()) &&
                    RelationshipLabel.same(relationship.path("label").asText(null), label)
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean names(Relationship candidate, String destination, String label) {
        return candidate.getDestination().equals(destination) && RelationshipLabel.same(candidate.getLabel(), label);
    }

    private static boolean hasShape(JsonNode entry) {
        if (!entry.isObject() || !entry.path("source").isTextual() || !entry.path("destination").isTextual()) {
            return false;
        }
        if (entry.has("label") && !entry.get("label").isNull() && !entry.get("label").isTextual()) {
            return false;
        }
        val names = entry.fieldNames();
        while (names.hasNext()) {
            if (!KEYS.contains(names.next())) {
                return false;
            }
        }
        return true;
    }
}

package io.morin.archicode.importer;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.StructurizrModel.Component;
import io.morin.archicode.importer.StructurizrModel.Container;
import io.morin.archicode.importer.StructurizrModel.Dropped;
import io.morin.archicode.importer.StructurizrModel.Link;
import io.morin.archicode.importer.StructurizrModel.Person;
import io.morin.archicode.importer.StructurizrModel.System;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.val;

/**
 * Reads the JSON export of a Structurizr workspace. It is pure: it takes a tree that is already parsed and touches no file.
 * The keys it reads are {@code model.people}, {@code model.softwareSystems} with their {@code containers} and
 * {@code components}, and the {@code relationships} of each element; the other keys are ignored, and the parts that the
 * author would miss are counted in {@link Dropped}.
 */
public final class StructurizrReader {

    /** The keys that hold what the importer drops and that are counted by what they hold, wherever they are. */
    private static final Set<String> COUNTED_ANYWHERE = Set.of("properties", "documentation", "perspectives");

    private StructurizrReader() {}

    /**
     * Read a workspace.
     *
     * @param root the parsed JSON
     * @param file the name of the file, as the author knows it, for the sentences
     * @return the model and what was dropped
     * @throws ArchiCodeException when the document has no model, or an element has no name
     */
    public static StructurizrModel read(JsonNode root, String file) {
        val model = root == null ? null : root.get("model");
        if (model == null || !model.isObject()) {
            throw new ArchiCodeException("%s is not a Structurizr workspace: it has no `model`", file);
        }
        val links = new ArrayList<Link>();
        var implied = 0;
        val people = new ArrayList<Person>();
        for (val node : array(model, "people")) {
            people.add(
                new Person(id(node), name(node, "person"), text(node, "description"), tags(node), text(node, "group"))
            );
            implied += links(node, links);
        }
        val systems = new ArrayList<System>();
        for (val node : array(model, "softwareSystems")) {
            val containers = new ArrayList<Container>();
            implied += links(node, links);
            for (val containerNode : array(node, "containers")) {
                val components = new ArrayList<Component>();
                implied += links(containerNode, links);
                for (val componentNode : array(containerNode, "components")) {
                    components.add(
                        new Component(
                            id(componentNode),
                            name(componentNode, "component"),
                            text(componentNode, "description"),
                            text(componentNode, "technology"),
                            tags(componentNode),
                            text(componentNode, "group")
                        )
                    );
                    implied += links(componentNode, links);
                }
                containers.add(
                    new Container(
                        id(containerNode),
                        name(containerNode, "container"),
                        text(containerNode, "description"),
                        text(containerNode, "technology"),
                        tags(containerNode),
                        text(containerNode, "group"),
                        components
                    )
                );
            }
            systems.add(
                new System(
                    id(node),
                    name(node, "software system"),
                    text(node, "description"),
                    tags(node),
                    text(node, "group"),
                    containers
                )
            );
        }
        val dropped = new Dropped(
            views(root.get("views")),
            size(model.get("deploymentNodes")),
            styles(root.get("views")),
            countedAnywhere(root, "documentation"),
            countedAnywhere(root, "properties"),
            countedAnywhere(root, "perspectives"),
            size(model.get("customElements")),
            isEmpty(root.get("configuration")) ? 0 : 1,
            implied
        );
        val name = text(root, "name");
        return new StructurizrModel(name, people, systems, links, dropped);
    }

    /** Collect the relationships of an element, and return how many were implied ones. */
    private static int links(JsonNode element, List<Link> into) {
        var implied = 0;
        for (val node : array(element, "relationships")) {
            if (node.hasNonNull("linkedRelationshipId")) {
                implied++;
            } else {
                into.add(
                    new Link(
                        id(node),
                        text(node, "sourceId"),
                        text(node, "destinationId"),
                        text(node, "description"),
                        text(node, "technology"),
                        tags(node)
                    )
                );
            }
        }
        return implied;
    }

    private static String id(JsonNode node) {
        return text(node, "id");
    }

    private static String name(JsonNode node, String kind) {
        val name = text(node, "name");
        if (name == null || name.isBlank()) {
            val id = id(node);
            throw new ArchiCodeException(
                "the %s with the Structurizr id %s has no name",
                kind,
                id == null ? "(none)" : "`" + id + "`"
            );
        }
        return name;
    }

    /** The text of a key (a number is read as its text, as an id is), or null when it is absent or null. */
    private static String text(JsonNode node, String key) {
        val value = node.get(key);
        return value == null || value.isNull() || value.isContainerNode() ? null : value.asText();
    }

    /** The tags, which Structurizr writes as one comma-separated text. */
    private static List<String> tags(JsonNode node) {
        val tags = text(node, "tags");
        if (tags == null) {
            return List.of();
        }
        return Arrays.stream(tags.split(","))
            .map(String::strip)
            .filter(tag -> !tag.isEmpty())
            .toList();
    }

    private static Iterable<JsonNode> array(JsonNode node, String key) {
        val value = node.get(key);
        return value == null || !value.isArray() ? List.of() : value;
    }

    private static int size(JsonNode node) {
        return node == null || !node.isContainerNode() ? 0 : node.size();
    }

    private static boolean isEmpty(JsonNode node) {
        return node == null || node.isNull() || (node.isContainerNode() && node.isEmpty());
    }

    /** The views of every kind: the entries of each array of the {@code views} object ({@code configuration} is not one). */
    private static int views(JsonNode views) {
        var count = 0;
        if (views != null && views.isObject()) {
            for (val entry : views.properties()) {
                if (entry.getValue().isArray()) {
                    count += entry.getValue().size();
                }
            }
        }
        return count;
    }

    private static int styles(JsonNode views) {
        val styles = views == null ? null : views.path("configuration").get("styles");
        var count = 0;
        if (styles != null && styles.isObject()) {
            for (val entry : styles.properties()) {
                count += entry.getValue().isArray() ? entry.getValue().size() : 0;
            }
        }
        return count;
    }

    /**
     * The nodes named {@code key} that are not empty, in the workspace and in its elements and relationships: the views and
     * the deployment nodes are counted by themselves, so they are not walked.
     */
    private static int countedAnywhere(JsonNode node, String key) {
        assert COUNTED_ANYWHERE.contains(key);
        var count = 0;
        if (node.isObject()) {
            for (Map.Entry<String, JsonNode> entry : node.properties()) {
                val name = entry.getKey();
                if ("views".equals(name) || "deploymentNodes".equals(name)) {
                    continue;
                }
                if (name.equals(key) && !isEmpty(entry.getValue())) {
                    count++;
                } else {
                    count += countedAnywhere(entry.getValue(), key);
                }
            }
        } else if (node.isArray()) {
            for (val child : node) {
                count += countedAnywhere(child, key);
            }
        }
        return count;
    }
}

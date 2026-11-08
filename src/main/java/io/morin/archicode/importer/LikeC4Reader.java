package io.morin.archicode.importer;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.LikeC4Model.Dropped;
import io.morin.archicode.importer.LikeC4Model.Element;
import io.morin.archicode.importer.LikeC4Model.Link;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import lombok.val;

/**
 * Reads the JSON export of a LikeC4 model. It is pure: it takes a tree that is already parsed and touches no file.
 * The keys it reads are {@code projectId}, {@code project}, {@code elements} and {@code relations}, and for the count of
 * what it drops the other parts of the export; every other key is ignored.
 */
public final class LikeC4Reader {

    private static final List<String> STYLE_KEYS = List.of("style", "color", "line", "head", "tail");

    private LikeC4Reader() {}

    /**
     * Read an export.
     *
     * @param root    the parsed JSON: an object, or an array of the objects of several projects
     * @param file    the name of the file, as the author knows it, for the sentences
     * @param project the id given with {@code --project}, or null
     * @return the model and what was dropped
     * @throws ArchiCodeException when the document is not an export, the project cannot be chosen, or an element is incomplete
     */
    public static LikeC4Model read(JsonNode root, String file, String project) {
        val model = select(root, file, project);
        val elementsNode = model.get("elements");
        if (elementsNode == null || !elementsNode.isObject()) {
            throw new ArchiCodeException("%s is not a LikeC4 JSON export: it has no elements", file);
        }
        val elements = new ArrayList<Element>();
        val ids = new HashSet<String>();
        for (val entry : elementsNode.properties()) {
            val node = entry.getValue();
            val id = text(node, "id") == null ? entry.getKey() : text(node, "id");
            val kind = text(node, "kind");
            if (kind == null || kind.isBlank()) {
                throw new ArchiCodeException("the LikeC4 element %s has no kind", id);
            }
            ids.add(id);
            val description = description(node.get("description"));
            elements.add(
                new Element(
                    id,
                    kind,
                    text(node, "title"),
                    description == null ? description(node.get("summary")) : description,
                    text(node, "technology"),
                    tags(node)
                )
            );
        }
        for (val element : elements) {
            val dot = element.id().lastIndexOf('.');
            if (dot > 0 && !ids.contains(element.id().substring(0, dot))) {
                throw new ArchiCodeException(
                    "the LikeC4 element %s has no parent %s in the file",
                    element.id(),
                    element.id().substring(0, dot)
                );
            }
        }
        val links = new ArrayList<Link>();
        val relations = model.get("relations");
        if (relations != null && relations.isObject()) {
            for (val entry : relations.properties()) {
                val node = entry.getValue();
                val title = text(node, "title");
                links.add(
                    new Link(
                        text(node, "id") == null ? entry.getKey() : text(node, "id"),
                        end(node.get("source")),
                        end(node.get("target")),
                        title == null ? description(node.get("description")) : title,
                        text(node, "technology"),
                        text(node, "kind"),
                        tags(node),
                        node.path("isBidirectional").asBoolean(false)
                    )
                );
            }
        }
        val projectNode = model.get("project");
        val title =
            projectNode == null || !projectNode.isObject()
                ? null
                : first(text(projectNode, "title"), text(projectNode, "name"));
        return new LikeC4Model(text(model, "projectId"), title, elements, links, dropped(model));
    }

    /** The object that is the model: the root, or the one of an array that the project names. */
    private static JsonNode select(JsonNode root, String file, String project) {
        if (root != null && root.isObject()) {
            val id = text(root, "projectId");
            if (project != null && id != null && !project.equals(id)) {
                throw new ArchiCodeException("%s holds no project %s: it holds %s", file, project, id);
            }
            return root;
        }
        if (root == null || !root.isArray() || root.isEmpty()) {
            throw new ArchiCodeException("%s is not a LikeC4 JSON export", file);
        }
        val ids = new ArrayList<String>();
        for (val node : root) {
            if (!node.isObject()) {
                throw new ArchiCodeException("%s is not a LikeC4 JSON export", file);
            }
            ids.add(text(node, "projectId") == null ? "(no id)" : text(node, "projectId"));
        }
        val list = String.join(", ", ids);
        if (project != null) {
            for (val node : root) {
                if (project.equals(text(node, "projectId"))) {
                    return node;
                }
            }
            throw new ArchiCodeException("%s holds no project %s: it holds %s", file, project, list);
        }
        if (root.size() == 1) {
            return root.get(0);
        }
        throw new ArchiCodeException(
            "%s holds %d projects (%s): choose one with --project <id>",
            file,
            root.size(),
            list
        );
    }

    private static Dropped dropped(JsonNode model) {
        var styles = 0;
        var metadata = 0;
        var links = 0;
        var navigateTo = 0;
        var notation = 0;
        for (val key : List.of("elements", "relations")) {
            val map = model.get(key);
            if (map == null || !map.isObject()) {
                continue;
            }
            for (val node : map) {
                styles += STYLE_KEYS.stream().anyMatch(k -> !isEmpty(node.get(k))) ? 1 : 0;
                metadata += isEmpty(node.get("metadata")) ? 0 : 1;
                links += isEmpty(node.get("links")) ? 0 : 1;
                navigateTo += isEmpty(node.get("navigateTo")) ? 0 : 1;
                notation += isEmpty(node.get("notation")) ? 0 : 1;
            }
        }
        val deployments = model.get("deployments");
        var globals = 0;
        val globalsNode = model.get("globals");
        if (globalsNode != null && globalsNode.isObject()) {
            for (val map : globalsNode) {
                globals += size(map);
            }
        }
        return new Dropped(
            size(model.get("views")),
            deployments == null ? 0 : size(deployments.get("elements")),
            deployments == null ? 0 : size(deployments.get("relations")),
            styles,
            metadata,
            links,
            navigateTo,
            notation,
            globals,
            size(model.get("imports")),
            size(model.get("diffs")),
            size(model.get("manualLayouts"))
        );
    }

    /** The id of an end of a relationship: the {@code model} of a reference, else null. */
    private static String end(JsonNode node) {
        if (node == null || !node.isObject()) {
            return null;
        }
        return text(node, "model");
    }

    /** A description is a text, or an object with {@code txt} or {@code md}. */
    private static String description(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isObject()) {
            return first(text(node, "txt"), text(node, "md"));
        }
        return node.isContainerNode() ? null : node.asText();
    }

    private static String first(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    /** The names of the tags, which the export writes as an array of names. */
    private static List<String> tags(JsonNode node) {
        val tags = node.get("tags");
        if (tags == null || !tags.isArray()) {
            return List.of();
        }
        val names = new ArrayList<String>();
        for (val tag : tags) {
            val name = tag.isObject() ? text(tag, "name") : tag.isContainerNode() ? null : tag.asText();
            if (name != null && !name.isBlank()) {
                names.add(name);
            }
        }
        return names;
    }

    /** The text of a key (a number is read as its text), or null when it is absent, null or a container. */
    private static String text(JsonNode node, String key) {
        val value = node.get(key);
        return value == null || value.isNull() || value.isContainerNode() ? null : value.asText();
    }

    private static int size(JsonNode node) {
        return node == null || !node.isContainerNode() ? 0 : node.size();
    }

    private static boolean isEmpty(JsonNode node) {
        return node == null || node.isNull() || (node.isContainerNode() && node.isEmpty());
    }
}

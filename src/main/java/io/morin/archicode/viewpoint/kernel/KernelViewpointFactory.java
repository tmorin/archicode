package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.ViewpointFactory;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.WeakHashMap;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * Creates the {@link Viewpoint} of a view by asking the {@link ViewpointKernel}, for any of its viewpoints (overview,
 * detailed, deep). All that is left to do here is translating: the element index becomes the kernel's graph, and the
 * kernel's items and links become {@link Item}s and {@link Link}s the renderers know.
 * <p>
 * Input of the kernel: {@code viewpoint}, {@code layer}, {@code focal} (the reference of the view's element),
 * {@code default_synthetic_label} and {@code elements}, one entry per element of the layer with its {@code reference},
 * whether it is a {@code parent}, the {@code applications} it hosts (technology nodes) and its egress
 * {@code relationships}. The deep viewpoint of the technology layer also needs the application layer
 * ({@code app_elements}). See {@code src/main/rust/viewpoint-kernel/src/lib.rs} for the whole contract.
 */
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class KernelViewpointFactory implements ViewpointFactory {

    /** The graph of an index, serialized once: a workspace generates one view per element. */
    private static final Map<ElementIndex, ArrayNode> GRAPHS = new WeakHashMap<>();

    @NonNull
    String viewpoint;

    @NonNull
    ObjectMapper objectMapper;

    private static synchronized ArrayNode graphOf(ElementIndex index, ObjectMapper objectMapper) {
        return GRAPHS.computeIfAbsent(index, i -> toGraph(i, objectMapper));
    }

    private static ArrayNode toGraph(ElementIndex index, ObjectMapper objectMapper) {
        val elements = objectMapper.createArrayNode();
        new TreeMap<>(index.elementByReferenceIndex).forEach((reference, element) -> {
            val node = elements.addObject();
            node.put("reference", reference);
            node.put("parent", element instanceof Parent<?>);
            if (element instanceof Node technologyNode) {
                val applications = node.putArray("applications");
                new java.util.TreeSet<>(technologyNode.getApplications()).forEach(applications::add);
            }
            val relationships = node.putArray("relationships");
            for (val relationship : Optional.ofNullable(element.getRelationships()).orElseGet(Set::of)) {
                val rel = relationships.addObject();
                rel.put("destination", relationship.getDestination());
                rel.put("label", relationship.getLabel());
                val qualifiers = rel.putArray("qualifiers");
                Optional.ofNullable(relationship.getQualifiers()).ifPresent(q -> q.forEach(qualifiers::add));
                val tags = rel.putObject("tags");
                Optional.ofNullable(relationship.getTags()).ifPresent(t -> t.forEach(tags::put));
            }
        });
        return elements;
    }

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create the {} viewpoint of {}", viewpoint, view);

        val focal = Objects.requireNonNull(view.getProperties()).path("element").asText("");
        if (focal.isBlank()) {
            throw new ArchiCodeException("the view %s has no element", view.getId());
        }

        val mainIndex = workspace.resolveMainIndexForView(view);
        val technology = view.getLayer() == View.Layer.TECHNOLOGY;

        val input = objectMapper.createObjectNode();
        input.put("viewpoint", viewpoint);
        input.put("layer", technology ? "technology" : "application");
        input.put("focal", focal);
        input.put("default_synthetic_label", workspace.getSettings().getRelationships().getDefaultSyntheticLabel());
        input.set("elements", graphOf(mainIndex, objectMapper));
        if (technology) {
            input.set("app_elements", graphOf(workspace.appIndex, objectMapper));
        }

        val output = objectMapper.readTree(
            ViewpointKernel.getInstance().compute(objectMapper.writeValueAsString(input))
        );
        if (output.has("error")) {
            throw new ArchiCodeException("%s", output.get("error").asText());
        }
        if (output.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, expected %s",
                output.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }

        val itemById = createItems(workspace, mainIndex, output.get("items"));
        val links = createLinks(workspace, mainIndex, output.get("links"), itemById);
        val roots = new HashSet<Item>();
        itemById.forEach((id, item) -> {
            if (isRoot(output.get("items"), id)) {
                roots.add(item);
            }
        });

        return Viewpoint.builder().workspace(workspace).view(view).items(roots).links(links).build();
    }

    private static boolean isRoot(JsonNode items, String id) {
        for (val item : items) {
            if (item.get("id").asText().equals(id)) {
                return item.get("parent").isNull();
            }
        }
        return false;
    }

    /**
     * The kernel lists a flat set of items with the id of their parent. The tree is assembled from the deepest items up,
     * so that an item is complete (its own children inside) before it is put in the set of its parent: an item's hash
     * depends on its children.
     */
    private Map<String, Item> createItems(Workspace workspace, ElementIndex mainIndex, JsonNode items) {
        val itemById = new LinkedHashMap<String, Item>();
        val parentById = new HashMap<String, String>();
        for (val node : items) {
            val id = node.get("id").asText();
            val reference = node.get("reference").asText();
            // an application deployed on a technology node: its item is told apart from the element's own by its id
            val deployedApplication = !id.equals(reference);
            val element = deployedApplication
                ? workspace.appIndex.getElementByReference(reference)
                : mainIndex.getElementByReference(reference);
            itemById.put(
                id,
                Item.builder()
                    .itemId(id)
                    .reference(deployedApplication ? "app:" + reference.replace(".", "_") : reference)
                    .element(element)
                    .kind(Item.Kind.from(element))
                    .build()
            );
            if (!node.get("parent").isNull()) {
                parentById.put(id, node.get("parent").asText());
            }
        }
        val deepestFirst = new ArrayList<>(parentById.keySet());
        deepestFirst.sort(Comparator.comparingInt((String id) -> depth(id, parentById)).reversed());
        for (val id : deepestFirst) {
            itemById.get(parentById.get(id)).getChildren().add(itemById.get(id));
        }
        return itemById;
    }

    private static int depth(String id, Map<String, String> parentById) {
        var depth = 0;
        for (var parent = parentById.get(id); parent != null; parent = parentById.get(parent)) {
            depth++;
        }
        return depth;
    }

    private Set<Link> createLinks(
        Workspace workspace,
        ElementIndex mainIndex,
        JsonNode links,
        Map<String, Item> itemById
    ) {
        val result = new HashSet<Link>();
        for (val node : links) {
            val from = itemById.get(node.get("from").asText());
            val to = itemById.get(node.get("to").asText());
            if (from == null || to == null) {
                throw new ArchiCodeException(
                    "the kernel linked unknown items %s and %s",
                    node.get("from"),
                    node.get("to")
                );
            }
            val synthetic = node.get("synthetic").asBoolean();
            val qualifiers = new ArrayList<String>();
            node.get("qualifiers").forEach(q -> qualifiers.add(q.asText()));

            val relationships = new LinkedHashSet<Relationship>();
            for (val rel : node.get("relationships")) {
                relationships.add(findRelationship(workspace, mainIndex, rel));
            }

            result.add(
                Link.builder()
                    .from(from)
                    .to(to)
                    .label(node.get("label").isNull() ? null : node.get("label").asText())
                    .synthetic(synthetic)
                    // the order of the qualifiers is the one of the declaration, except for a grouped link, whose
                    // qualifiers have always been a plain hash set
                    .qualifiers(synthetic ? new HashSet<>(qualifiers) : new LinkedHashSet<>(qualifiers))
                    .tags(
                        node.get("secondary").asBoolean() ? Map.of("rendering-secondary", "no") : new LinkedHashMap<>()
                    )
                    .relationships(relationships)
                    .build()
            );
        }
        return result;
    }

    /** The relationship, as declared, that a link of the kernel stands for. */
    private Relationship findRelationship(Workspace workspace, ElementIndex mainIndex, JsonNode rel) {
        val owner = mainIndex
            .searchElement(rel.get("from").asText())
            .or(() -> workspace.appIndex.searchElement(rel.get("from").asText()))
            .orElseThrow(() -> new ArchiCodeException("unable to find the element %s", rel.get("from").asText()));
        val destination = rel.get("destination").asText();
        val label = rel.get("label").isNull() ? null : rel.get("label").asText();
        val qualifiers = new HashSet<String>();
        rel.get("qualifiers").forEach(q -> qualifiers.add(q.asText()));
        for (val candidate : Optional.ofNullable(owner.getRelationships()).orElseGet(Set::of)) {
            if (
                candidate.getDestination().equals(destination) &&
                Objects.equals(candidate.getLabel(), label) &&
                new HashSet<>(Optional.ofNullable(candidate.getQualifiers()).orElseGet(Set::of)).equals(qualifiers)
            ) {
                return candidate;
            }
        }
        throw new ArchiCodeException(
            "unable to find the relationship from %s to %s",
            rel.get("from").asText(),
            destination
        );
    }
}

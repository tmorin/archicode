package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.Change;
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
import java.util.TreeSet;
import java.util.WeakHashMap;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * Creates the {@link Viewpoint} of a view by asking the {@link ViewpointKernel}, for any of its viewpoints (overview,
 * detailed, deep, and the map of a layer). All that is left to do here is translating: the element index becomes the kernel's graph, and the
 * kernel's items and links become {@link Item}s and {@link Link}s the renderers know.
 * <p>
 * Input of the kernel: {@code viewpoint}, {@code layer}, {@code focal} (the reference of the view's element),
 * {@code default_synthetic_label} and {@code elements}, one entry per element of the layer with its {@code reference},
 * whether it is a {@code parent}, the {@code applications} it hosts (technology nodes), the environments it
 * {@code uses} (technology environments) and its egress {@code relationships}, and its {@code qualifiers} and {@code tags}, from which the kernel tells the {@code stereotypes} of an item. The viewpoints of the technology layer also need the application layer
 * ({@code app_elements}: the deployed applications, which the map draws too, and the dependencies they give, unless the view says {@code applications: false} or {@code relationships: false}), and {@code application_links} and {@code hide_unlinked} for the workspace of a facet. See {@code src/main/rust/viewpoint-kernel/src/lib.rs} for the whole contract.
 */
@Slf4j
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class KernelViewpointFactory implements ViewpointFactory {

    /** The graph of an index, serialized once: a workspace generates one view per element. */
    private static final Map<ElementIndex, ArrayNode> GRAPHS = new WeakHashMap<>();

    /** The viewpoint with no focal element: the whole layer, folded, with what is pinned, hidden and open. */
    public static final String MAP = "map";

    @NonNull
    String viewpoint;

    @NonNull
    ObjectMapper objectMapper;

    /** The comparison the views are about, or null: the views are then those of the workspace, as they always were. */
    Comparison comparison;

    /** Keep only what changed, and its context. Without a comparison, nothing changed. */
    boolean onlyChanges;

    /** The views of a workspace. */
    public KernelViewpointFactory(@NonNull String viewpoint, @NonNull ObjectMapper objectMapper) {
        this(viewpoint, objectMapper, null, false);
    }

    /**
     * The views of a comparison.
     *
     * @param viewpoint {@code overview}, {@code detailed}, {@code deep} or {@code map}
     * @param objectMapper to speak JSON with the kernel
     * @param comparison what the kernel said of two plateaus, or null for the views of the workspace
     * @param onlyChanges draw only what changed, with the context it needs
     */
    public KernelViewpointFactory(
        @NonNull String viewpoint,
        @NonNull ObjectMapper objectMapper,
        Comparison comparison,
        boolean onlyChanges
    ) {
        this.viewpoint = viewpoint;
        this.objectMapper = objectMapper;
        this.comparison = comparison;
        this.onlyChanges = onlyChanges;
    }

    /** The union of a comparison, kept to what the index of a faceted workspace still holds, built once per index. */
    private static final Map<ElementIndex, FacetedUnion> FACETED_UNIONS = new WeakHashMap<>();

    private record FacetedUnion(Comparison comparison, ArrayNode elements) {}

    private static synchronized ArrayNode graphOf(ElementIndex index, ObjectMapper objectMapper) {
        return GRAPHS.computeIfAbsent(index, i -> KernelGraph.of(i, objectMapper, false));
    }

    /**
     * The elements of a layer of the comparison, as {@code compute} takes them. For the workspace of a facet, only the
     * elements and the relationships the facet left: the facet was applied to the union (with {@code change} in it),
     * the index of the workspace says what is left.
     */
    private static synchronized ArrayNode unionOf(
        Comparison comparison,
        Workspace workspace,
        View.Layer layer,
        ObjectMapper objectMapper
    ) {
        if (!workspace.isFaceted()) {
            return comparison.unionElements(layer);
        }
        val index = layer == View.Layer.APPLICATION ? workspace.appIndex : workspace.techIndex;
        val known = FACETED_UNIONS.get(index);
        if (known != null && known.comparison == comparison) {
            return known.elements;
        }
        val union = comparison.unionElements(layer);
        val kept = objectMapper.createArrayNode();
        for (val node : union) {
            val model = index.searchElement(node.path("reference").asText());
            if (model.isEmpty()) {
                continue;
            }
            val copy = (ObjectNode) node.deepCopy();
            val relationships = copy.putArray("relationships");
            for (val rel : node.path("relationships")) {
                if (declares(model.get(), rel)) {
                    relationships.add(rel);
                }
            }
            // what the facet left of the deployment: the entries of the union (said as the target says them, also for a node that
            // only the baseline had) that the faceted workspace still has. The model is not the source: a node of the baseline
            // still names the application that was replaced, which the union does not hold
            if (model.get() instanceof Node) {
                val applications = copy.putArray("applications");
                new TreeSet<String>(strings(node.path("applications")))
                    .stream()
                    .filter(reference -> workspace.appIndex.searchElement(reference).isPresent())
                    .forEach(applications::add);
            }
            if (model.get() instanceof Environment) {
                val uses = copy.putArray("uses");
                new TreeSet<String>(strings(node.path("uses")))
                    .stream()
                    .filter(reference -> workspace.techIndex.searchElement(reference).isPresent())
                    .forEach(uses::add);
            }
            kept.add(copy);
        }
        FACETED_UNIONS.put(index, new FacetedUnion(comparison, kept));
        return kept;
    }

    /**
     * The elements the map is about ({@code pinned}), the ones it leaves out ({@code hidden}) and the boxes that are open
     * ({@code opened}), from the properties of the view, which the editor writes as it draws them. A workspace of a facet
     * may have lost an element the view names: the entry is then dropped (a facet removes an element without a word, and so
     * does the editor). So is an entry the plateau drawn does not have: a view belongs to no plateau, and a name that another
     * plateau has is left out of this one (issue #100; the command line says so, see {@code GenerateViewsCommand}). In any
     * other workspace the kernel refuses the one it cannot find, and the view is named in the error.
     */
    private void mapLists(ObjectNode input, View view, Workspace workspace, ElementIndex mainIndex) {
        // a map with nothing pinned, hidden or open has no properties at all
        val properties = Optional.<JsonNode>ofNullable(view.getProperties()).orElseGet(objectMapper::createObjectNode);
        for (val list : List.of("opened", "pinned", "hidden")) {
            val kept = input.putArray(list);
            for (val entry : properties.path(list)) {
                if (!entry.isTextual()) {
                    throw new ArchiCodeException(
                        "the view %s: `%s` is a list of references, and %s is not one",
                        view.getId(),
                        list,
                        entry
                    );
                }
                if (
                    (workspace.isFaceted() || workspace.getPlateau() != null) &&
                    mainIndex.searchElement(entry.asText()).isEmpty()
                ) {
                    continue;
                }
                kept.add(entry.asText());
            }
        }
    }

    /**
     * The relationships the map draws ({@code links}, issue #143): the key is given to the kernel only when entries remain, so
     * that a map without it is drawn as it always was. In a workspace of a plateau or of a facet, an entry whose relationship
     * the index lacks is dropped (the rule of {@link #mapLists} for {@code pinned}; the command line warns, see
     * {@code ViewInPlateau}); in any other the kernel refuses it.
     */
    private void mapLinks(ObjectNode input, View view, Workspace workspace, ElementIndex mainIndex) {
        val filtered = comparison == null && (workspace.isFaceted() || workspace.getPlateau() != null);
        val kept = objectMapper.createArrayNode();
        for (val entry : MapLinks.entries(view.getProperties(), view.getId())) {
            if (!filtered || MapLinks.exists(mainIndex, entry)) {
                kept.add(entry);
            }
        }
        if (!kept.isEmpty()) {
            input.set(MapLinks.KEY, kept);
        }
    }

    /**
     * The relationships the map marks ({@code highlight}, issue #143, wave 026 run 0198): given to the kernel only when entries
     * remain. In a workspace of a plateau or of a facet an entry whose relationship is not there is dropped (the command line warns,
     * see {@code ViewInPlateau}); in a comparison a relationship that only the plateau compared with had is there.
     */
    private void mapHighlight(ObjectNode input, View view, Workspace workspace, ElementIndex mainIndex) {
        val filtered = workspace.isFaceted() || workspace.getPlateau() != null;
        val kept = objectMapper.createArrayNode();
        for (val entry : MapLinks.entries(view.getProperties(), view.getId(), MapLinks.HIGHLIGHT)) {
            val there =
                MapLinks.exists(mainIndex, entry) || (comparison != null && MapLinks.existsInUnion(comparison, entry));
            if (!filtered || there) {
                kept.add(entry);
            }
        }
        if (!kept.isEmpty()) {
            input.set(MapLinks.HIGHLIGHT, kept);
        }
    }

    /**
     * What the map of the technology layer draws besides its elements: the applications deployed on the nodes ({@code applications}) and the links ({@code relationships}).
     * Both are drawn unless the properties of the view say {@code false} (a value that is not the boolean {@code false} is no choice, as in the editor).
     */
    private void mapParts(ObjectNode input, View view) {
        val properties = Optional.<JsonNode>ofNullable(view.getProperties()).orElseGet(objectMapper::createObjectNode);
        for (val part : List.of("applications", "relationships")) {
            if (properties.path(part).isBoolean() && !properties.path(part).asBoolean()) {
                input.put(part, false);
            }
        }
    }

    private static List<String> strings(JsonNode list) {
        val out = new ArrayList<String>();
        list.forEach(item -> out.add(item.asText()));
        return out;
    }

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create the {} viewpoint of {}", viewpoint, view);

        val map = MAP.equals(viewpoint);
        // the map has no focal element: every element of the layer is in play, `pinned`, `hidden` and `opened` say which
        val focal = map
            ? ""
            : Optional.<JsonNode>ofNullable(view.getProperties())
                  .map(p -> p.path("element").asText(""))
                  .orElse("");
        if (!map && focal.isBlank()) {
            throw new ArchiCodeException(
                "the view `%s` has no element: write the reference of one in `properties.element`",
                view.getId()
            );
        }

        val mainIndex = workspace.resolveMainIndexForView(view);
        val technology = view.getLayer() == View.Layer.TECHNOLOGY;

        val input = objectMapper.createObjectNode();
        input.put("viewpoint", viewpoint);
        input.put("layer", technology ? "technology" : "application");
        input.put("focal", focal);
        // `default-synthetic-label: ~` is a null in the settings: the kernel is given the built-in label then
        input.put(
            "default_synthetic_label",
            Optional.ofNullable(workspace.getSettings().getRelationships().getDefaultSyntheticLabel()).orElse(
                Settings.Relationships.builder().build().getDefaultSyntheticLabel()
            )
        );
        input.set(
            "elements",
            comparison == null
                ? graphOf(mainIndex, objectMapper)
                : unionOf(comparison, workspace, view.getLayer(), objectMapper)
        );
        if (onlyChanges) {
            input.put("only_changes", true);
        }
        if (map) {
            mapLists(input, view, workspace, mainIndex);
            mapLinks(input, view, workspace, mainIndex);
            mapHighlight(input, view, workspace, mainIndex);
        }
        if (technology) {
            // the application layer: the applications deployed on the nodes, which the viewpoints of an element draw inside them and derive links from, and which the map
            // of the technology layer draws too (issue #107), unless its properties say `applications: false` or `relationships: false`
            input.set(
                "app_elements",
                comparison == null
                    ? graphOf(workspace.appIndex, objectMapper)
                    : unionOf(comparison, workspace, View.Layer.APPLICATION, objectMapper)
            );
            if (map) {
                mapParts(input, view);
            }
        }
        if (technology && !map) {
            // the facets are applied to the workspace before the views are asked for: the kernel is told a view is about a flow
            if (workspace.isFaceted()) {
                input.put("application_links", true);
                input.put("hide_unlinked", workspace.isHideUnlinked());
            }
        }

        val output = objectMapper.readTree(
            ViewpointKernel.getInstance().compute(objectMapper.writeValueAsString(input))
        );
        if (output.has("error")) {
            val raw = output.get("error").asText();
            var message = danglingSentence(workspace, raw);
            if (
                !map &&
                message.equals(raw) &&
                (raw.equals("dangling reference: " + focal) || raw.equals("unknown focal element: " + focal))
            ) {
                // the focal element exists nowhere: the sentence the editor says too (run 0180, #170)
                message = "the view `%s` names `%s`, which does not exist".formatted(view.getId(), focal);
            }
            throw new ArchiCodeException("%s", map ? "the view " + view.getId() + ": " + message : message);
        }
        if (output.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, expected %s",
                output.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }

        val itemById = createItems(workspace, mainIndex, output.get("items"), identities(workspace, mainIndex));
        val links = createLinks(workspace, mainIndex, output.get("links"), itemById);
        val childIds = new HashSet<String>();
        for (val item : output.get("items")) {
            if (!item.get("parent").isNull()) {
                childIds.add(item.get("id").asText());
            }
        }
        val roots = new HashSet<Item>();
        itemById.forEach((id, item) -> {
            if (!childIds.contains(id)) {
                roots.add(item);
            }
        });

        return Viewpoint.builder()
            .workspace(workspace)
            .view(view)
            .items(roots)
            .links(links)
            .compared(comparison != null)
            .build();
    }

    /**
     * The kernel lists a flat set of items with the id of their parent. The tree is assembled from the deepest items up,
     * so that an item is complete (its own children inside) before it is put in the set of its parent: an item's hash
     * depends on its children.
     */
    private Map<String, Item> createItems(
        Workspace workspace,
        ElementIndex mainIndex,
        JsonNode items,
        Map<String, Comparison.ElementChange> identities
    ) {
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
            // what an element replaces, or what replaces it, is told by the comparison and by nothing else
            val identity = identities.get(deployedApplication ? "application\0" + reference : reference);
            val item = Item.builder()
                .itemId(id)
                .reference(deployedApplication ? "app:" + reference.replace(".", "_") : reference)
                .element(element)
                .kind(Item.Kind.from(element))
                .stereotypes(stereotypesOf(node))
                .change(changeOf(node))
                .containsChanges(node.path("contains_changes").asBoolean(false))
                .natures(stringsOf(node.path("natures")))
                .replaces(identity == null ? List.of() : identity.replaces())
                .replacedBy(identity == null ? List.of() : identity.replacedBy())
                .context(node.path("context").asBoolean(false))
                .build();
            val previous = itemById.putIfAbsent(id, item);
            if (previous != null) {
                throw new ArchiCodeException(
                    "the viewpoint kernel gave the same id %s to %s and to %s",
                    id,
                    previous.getReference(),
                    item.getReference()
                );
            }
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

    /**
     * The elements of the layer being drawn that replace others (or are replaced and still drawn), by reference; the
     * applications deployed on a node are told apart by the prefix {@code application\0}. Empty without a comparison.
     */
    private Map<String, Comparison.ElementChange> identities(Workspace workspace, ElementIndex mainIndex) {
        val identities = new HashMap<String, Comparison.ElementChange>();
        if (comparison == null) {
            return identities;
        }
        val mainLayer = mainIndex == workspace.techIndex ? "technology" : "application";
        for (val element : comparison.getElements()) {
            if (element.replaces().isEmpty() && element.replacedBy().isEmpty()) {
                continue;
            }
            if (element.layer().equals(mainLayer)) {
                identities.put(element.reference(), element);
            }
            if ("application".equals(element.layer())) {
                identities.put("application\0" + element.reference(), element);
            }
        }
        return identities;
    }

    private static List<String> stereotypesOf(JsonNode item) {
        return stringsOf(item.path("stereotypes"));
    }

    private static List<String> stringsOf(JsonNode list) {
        val strings = new ArrayList<String>();
        list.forEach(string -> strings.add(string.asText()));
        return List.copyOf(strings);
    }

    /** What the kernel said of an item or a link; none when it said nothing (a view that does not compare). */
    private static Change changeOf(JsonNode node) {
        return Change.of(node.path("change").asText("none"));
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
                // the owner of a relationship that an application declares, in a view of the technology layer, is in
                // the application layer (it is the case of the whole of a secondary link)
                relationships.add(
                    findRelationship(
                        node.get("secondary").asBoolean() || rel.path("application").asBoolean()
                            ? workspace.appIndex
                            : mainIndex,
                        rel
                    )
                );
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
                    .change(changeOf(node))
                    .highlighted(node.path("highlighted").asBoolean(false))
                    .build()
            );
        }
        return result;
    }

    private static boolean matches(
        Relationship candidate,
        String destination,
        String label,
        Set<String> qualifiers,
        Map<String, String> tags
    ) {
        return (
            candidate.getDestination().equals(destination) &&
            RelationshipLabel.same(candidate.getLabel(), label) &&
            new HashSet<>(Optional.ofNullable(candidate.getQualifiers()).orElseGet(Set::of)).equals(qualifiers) &&
            new HashMap<>(Optional.ofNullable(candidate.getTags()).orElseGet(Map::of)).equals(tags)
        );
    }

    /**
     * The kernel can only say {@code dangling reference: x}. When an element of the graph holds {@code x} (a relationship
     * destination, a {@code uses} entry, a hosted application) the author is told which one, in which file and at which key
     * (issue #159); a reference that only a view names keeps the kernel's words.
     */
    private static String danglingSentence(Workspace workspace, String message) {
        val named = DANGLING.matcher(message);
        if (!named.matches()) {
            return message;
        }
        return workspace.danglingSentence(named.group(1)).orElse(message);
    }

    private static final java.util.regex.Pattern DANGLING = java.util.regex.Pattern.compile(
        "dangling (?:application )?reference: (.+)"
    );

    /** Whether the element declares the relationship of the union (same destination, label, qualifiers and tags). */
    private static boolean declares(Element element, JsonNode rel) {
        val qualifiers = new HashSet<String>();
        rel.path("qualifiers").forEach(q -> qualifiers.add(q.asText()));
        val tags = new HashMap<String, String>();
        rel.path("tags")
            .fields()
            .forEachRemaining(tag -> tags.put(tag.getKey(), tag.getValue().asText()));
        val label = rel.path("label").isNull() || rel.path("label").isMissingNode() ? null : rel.get("label").asText();
        return Optional.ofNullable(element.getRelationships())
            .orElseGet(Set::of)
            .stream()
            .anyMatch(candidate -> matches(candidate, rel.path("destination").asText(), label, qualifiers, tags));
    }

    /** The relationship, as declared, that a link of the kernel stands for. */
    private Relationship findRelationship(ElementIndex ownerIndex, JsonNode rel) {
        val owner = ownerIndex
            .searchElement(rel.get("from").asText())
            .orElseThrow(() -> new ArchiCodeException("unable to find the element %s", rel.get("from").asText()));
        val destination = rel.get("destination").asText();
        val label = rel.get("label").isNull() ? null : rel.get("label").asText();
        val qualifiers = new HashSet<String>();
        rel.get("qualifiers").forEach(q -> qualifiers.add(q.asText()));
        val tags = new HashMap<String, String>();
        rel.path("tags")
            .fields()
            .forEachRemaining(tag -> tags.put(tag.getKey(), tag.getValue().asText()));
        val candidates = Optional.ofNullable(owner.getRelationships()).orElseGet(Set::of);
        // the label as written first, so that a workspace without a comparison is read as it always was
        for (val candidate : candidates) {
            if (
                Objects.equals(candidate.getLabel(), label) && matches(candidate, destination, label, qualifiers, tags)
            ) {
                return candidate;
            }
        }
        for (val candidate : candidates) {
            if (matches(candidate, destination, label, qualifiers, tags)) {
                return candidate;
            }
        }
        if ("removed".equals(rel.path("change").asText("none"))) {
            // a relationship only the base had: the elements of the target do not declare it, the comparison knows it
            return Relationship.builder()
                .destination(destination)
                .label(label)
                .qualifiers(qualifiers)
                .tags(tags)
                .build();
        }
        throw new ArchiCodeException(
            "unable to find the relationship from %s to %s",
            rel.get("from").asText(),
            destination
        );
    }
}

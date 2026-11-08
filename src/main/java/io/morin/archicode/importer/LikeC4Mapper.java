package io.morin.archicode.importer;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.LikeC4Model.Element;
import io.morin.archicode.importer.LikeC4Model.Link;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.manifest.ManifestKind;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Component;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.Nesting;
import io.morin.archicode.resource.element.application.Person;
import io.morin.archicode.resource.element.application.System;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import lombok.val;

/**
 * Maps a LikeC4 model to the manifests of an ArchiCode workspace. It is pure: it reads no file, writes none and serializes
 * nothing; the caller serializes what it returns.
 *
 * <p>The kind of an element is {@code actor} to {@code person}, {@code system}, {@code container} and {@code component} to
 * themselves, or what {@code --map <kind>=<kind>} says; any other kind is an error, which names all of them. The tree is
 * built from the dotted ids. An element that the nesting of ArchiCode cannot hold, with everything under it, is not written
 * and is one line of {@link Mapped#droppedElements()}; the nesting is read from {@link Nesting}, never copied.
 *
 * <p>The id of an element is its last id segment, lowercased, with every run of characters outside {@code [a-z0-9_-]}
 * replaced by one {@code _} and trimmed of {@code _}. A segment with no letter and no digit takes the fallback
 * {@code <kind>_<n>}, {@code n} being the 1-based position among the siblings. Siblings are all the elements under one
 * parent, whatever their kind and whether or not they are dropped, in the order of the export.
 */
public final class LikeC4Mapper {

    private static final Map<String, ManifestKind> DEFAULTS = Map.of(
        "actor",
        ManifestKind.PERSON,
        "system",
        ManifestKind.SYSTEM,
        "container",
        ManifestKind.CONTAINER,
        "component",
        ManifestKind.COMPONENT
    );

    private static final List<ManifestKind> TARGETS = List.of(
        ManifestKind.PERSON,
        ManifestKind.SYSTEM,
        ManifestKind.CONTAINER,
        ManifestKind.COMPONENT
    );

    private static final String TARGET_LIST = "person|system|container|component";

    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;

    private LikeC4Mapper() {}

    /**
     * What the mapping gives.
     *
     * @param manifests            the manifests, parents before their children, in the order of the export
     * @param workspace            the content of {@code .archicode.yaml}
     * @param elements             the number of elements written
     * @param relationships        the number of relationships written
     * @param droppedRelationships the relationships whose source or target is not a written element
     * @param bidirectional        the written relationships that are flagged bidirectional and written in one direction
     * @param droppedElements      one sentence per element not written, a parent before the elements it holds
     * @param rewrites             one sentence per rewritten id, in the order of the elements
     */
    public record Mapped(
        List<Planned> manifests,
        WorkspaceFile workspace,
        int elements,
        int relationships,
        int droppedRelationships,
        int bidirectional,
        List<String> droppedElements,
        List<String> rewrites
    ) {}

    /** An element with its kind and its children, as the mapper walks it. */
    private record Node(Element element, ManifestKind kind, List<Node> children) {}

    /** A written element with the id and the reference it is given. */
    private record Placed(Node node, String parent, String reference, String id) {}

    /** The state of one mapping. */
    private record Walk(List<Placed> placed, List<String> dropped, List<String> rewrites) {}

    /**
     * Map a model.
     *
     * @param model the model the reader gave
     * @param maps  the values of the {@code --map} options, each {@code <kind>=<kind>}, in the order given; may be empty
     * @param file  the name of the workspace when the export has no title and no project id
     * @return the manifests and the report of the mapping
     * @throws ArchiCodeException when a {@code --map} is wrong, a kind has no target, or an element has no parent in the model
     */
    public static Mapped map(LikeC4Model model, List<String> maps, String file) {
        val kinds = kinds(model, maps);
        val roots = tree(model, kinds);
        val walk = new Walk(new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
        place(null, null, roots, walk);
        val references = new HashMap<String, String>();
        for (val p : walk.placed()) {
            references.put(p.node().element().id(), p.reference());
        }
        val bySource = new LinkedHashMap<String, List<ObjectNode>>();
        var written = 0;
        var dropped = 0;
        var bidirectional = 0;
        for (val link : model.links()) {
            val source = link.source() == null ? null : references.get(link.source());
            val destination = link.target() == null ? null : references.get(link.target());
            if (source == null || destination == null) {
                dropped++;
                continue;
            }
            bySource.computeIfAbsent(link.source(), key -> new ArrayList<>()).add(relationship(link, destination));
            written++;
            if (link.bidirectional()) {
                bidirectional++;
            }
        }
        val planned = new ArrayList<Planned>();
        for (val p : walk.placed()) {
            planned.add(
                new Planned(
                    "manifests/" + p.reference() + ".yaml",
                    manifest(p, bySource.getOrDefault(p.node().element().id(), List.of()))
                )
            );
        }
        val workspace = new WorkspaceFile(
            new WorkspaceFile.Settings(name(model, file), new WorkspaceFile.Manifests(List.of("manifests/**")))
        );
        return new Mapped(
            List.copyOf(planned),
            workspace,
            walk.placed().size(),
            written,
            dropped,
            bidirectional,
            List.copyOf(walk.dropped()),
            List.copyOf(walk.rewrites())
        );
    }

    private static String name(LikeC4Model model, String file) {
        if (model.title() != null && !model.title().isBlank()) {
            return model.title();
        }
        if (model.projectId() != null && !model.projectId().isBlank()) {
            return model.projectId();
        }
        return file;
    }

    /** The ArchiCode kind of each LikeC4 kind present, or the error that tells what to fix. */
    private static Map<String, ManifestKind> kinds(LikeC4Model model, List<String> maps) {
        val present = new LinkedHashSet<String>();
        for (val element : model.elements()) {
            present.add(element.kind());
        }
        val given = new LinkedHashMap<String, ManifestKind>();
        for (val option : maps) {
            val equals = option.indexOf('=');
            val source = equals < 0 ? "" : option.substring(0, equals).trim();
            val target = equals < 0 ? "" : option.substring(equals + 1).trim();
            if (source.isEmpty() || target.isEmpty()) {
                throw new ArchiCodeException(
                    "--map %s is not <kind>=<kind>: write the LikeC4 kind, then =, then %s",
                    option,
                    TARGET_LIST.replace("|", ", ")
                );
            }
            val kind = target(target);
            if (kind == null) {
                throw new ArchiCodeException(
                    "--map %s: %s is not an ArchiCode kind: use %s",
                    option,
                    target,
                    TARGET_LIST.replace("|", ", ")
                );
            }
            if (given.containsKey(source)) {
                throw new ArchiCodeException("--map names the kind %s twice", source);
            }
            given.put(source, kind);
        }
        for (val source : given.keySet()) {
            if (!present.contains(source)) {
                throw new ArchiCodeException(
                    "--map names the kind %s, which no element of the model has (kinds: %s)",
                    source,
                    String.join(", ", present)
                );
            }
        }
        val resolved = new LinkedHashMap<String, ManifestKind>();
        val missing = new ArrayList<String>();
        for (val kind : present) {
            val target = given.containsKey(kind) ? given.get(kind) : DEFAULTS.get(kind);
            if (target == null) {
                missing.add(kind);
            } else {
                resolved.put(kind, target);
            }
        }
        if (!missing.isEmpty()) {
            throw new ArchiCodeException(
                "no ArchiCode kind for the LikeC4 kind(s) %s: map each with --map <kind>=<%s>",
                String.join(", ", missing),
                TARGET_LIST
            );
        }
        return resolved;
    }

    private static ManifestKind target(String name) {
        for (val kind : TARGETS) {
            if (kind.getSubTypeName().equals(name)) {
                return kind;
            }
        }
        return null;
    }

    /** The roots of the tree the dotted ids make, children in the order of the export. */
    private static List<Node> tree(LikeC4Model model, Map<String, ManifestKind> kinds) {
        val nodes = new LinkedHashMap<String, Node>();
        for (val element : model.elements()) {
            nodes.put(element.id(), new Node(element, kinds.get(element.kind()), new ArrayList<>()));
        }
        val roots = new ArrayList<Node>();
        for (val node : nodes.values()) {
            val id = node.element().id();
            val dot = id.lastIndexOf('.');
            if (dot > 0) {
                val parent = nodes.get(id.substring(0, dot));
                if (parent == null) {
                    throw new ArchiCodeException(
                        "the LikeC4 element %s has no parent %s in the file",
                        id,
                        id.substring(0, dot)
                    );
                }
                parent.children().add(node);
            } else {
                roots.add(node);
            }
        }
        return roots;
    }

    private static String segment(String id) {
        val dot = id.lastIndexOf('.');
        return dot > 0 ? id.substring(dot + 1) : id;
    }

    /**
     * Give an id to each of the siblings, drop what the nesting cannot hold, then go down, parents before children.
     *
     * @param parent    the parent, or null at the top
     * @param reference the reference of the parent when it is written, else null
     * @param siblings  the elements under the parent
     * @param walk      where the result goes
     */
    private static void place(Node parent, String reference, List<Node> siblings, Walk walk) {
        val bases = new ArrayList<String>();
        val rewritten = new ArrayList<Boolean>();
        for (var i = 0; i < siblings.size(); i++) {
            val sibling = siblings.get(i);
            val segment = segment(sibling.element().id());
            var base = ImportIds.slug(segment);
            var changed = ImportIds.rewritesCharacter(segment, false);
            if (!ImportIds.hasAlphanumeric(base)) {
                base = ImportIds.slug(sibling.kind().getSubTypeName() + "_" + (i + 1));
                changed = true;
            }
            bases.add(base);
            rewritten.add(changed);
        }
        val assigned = ImportIds.assign(bases, rewritten);
        val parentDropped = parent != null && reference == null;
        for (var i = 0; i < siblings.size(); i++) {
            val sibling = siblings.get(i);
            val reason = parentDropped
                ? "held by the dropped element " + parent.element().id()
                : unheld(parent, sibling);
            if (reason != null) {
                walk.dropped().add(dropped(sibling, reason));
                place(sibling, null, sibling.children(), walk);
                continue;
            }
            val id = assigned.ids().get(i);
            val ref = reference == null ? id : reference + "." + id;
            walk.placed().add(new Placed(sibling, reference, ref, id));
            if (assigned.rewritten().get(i)) {
                walk.rewrites().add(
                    String.format("the id of the LikeC4 element %s is written as %s", sibling.element().id(), id)
                );
            }
            place(sibling, ref, sibling.children(), walk);
        }
    }

    private static String dropped(Node node, String reason) {
        return String.format(
            "element %s (kind %s, mapped to %s) dropped: %s",
            node.element().id(),
            node.element().kind(),
            node.kind().getSubTypeName(),
            reason
        );
    }

    /** Why the nesting cannot hold the element under its parent, or null when it can. */
    private static String unheld(Node parent, Node child) {
        val name = child.kind().getSubTypeName();
        if (parent == null) {
            val layer = Application.builder().build();
            return Nesting.kindsHeldAtTheTop(layer).contains(name)
                ? null
                : String.format("a %s cannot be at the top of the layer", name);
        }
        return Nesting.kindsHeldBy(bare(parent.kind())).contains(name)
            ? null
            : String.format("a %s (%s) cannot hold a %s", parent.kind().getSubTypeName(), parent.element().id(), name);
    }

    /** An instance of the class of the kind, to ask the nesting what it holds. */
    private static io.morin.archicode.resource.element.Element bare(ManifestKind kind) {
        return switch (kind) {
            case PERSON -> Person.builder().id("p").build();
            case SYSTEM -> System.builder().id("s").build();
            case CONTAINER -> Container.builder().id("c").build();
            default -> Component.builder().id("k").build();
        };
    }

    private static Manifest manifest(Placed placed, List<ObjectNode> relationships) {
        val element = placed.node().element();
        val content = JSON.objectNode();
        content.put("id", placed.id());
        content.put(
            "name",
            element.title() == null || element.title().isBlank() ? segment(element.id()) : element.title()
        );
        if (element.description() != null && !element.description().isBlank()) {
            content.put("description", element.description());
        }
        val qualifiers = new LinkedHashSet<String>();
        if (element.technology() != null && !element.technology().isBlank()) {
            qualifiers.add(element.technology());
        }
        qualifiers.addAll(element.tags());
        if (!qualifiers.isEmpty()) {
            val array = content.putArray("qualifiers");
            qualifiers.forEach(array::add);
        }
        val tags = content.putObject("tags");
        tags.put("likec4.id", element.id());
        tags.put("likec4.kind", element.kind());
        if (!relationships.isEmpty()) {
            val array = content.putArray("relationships");
            relationships.forEach(array::add);
        }
        return Manifest.builder()
            .header(Manifest.Header.builder().kind(placed.node().kind()).version("1").parent(placed.parent()).build())
            .content(content)
            .build();
    }

    private static ObjectNode relationship(Link link, String destination) {
        val node = JSON.objectNode();
        node.put("destination", destination);
        if (link.title() != null && !link.title().isBlank()) {
            node.put("label", link.title());
        }
        val qualifiers = new LinkedHashSet<String>();
        if (link.technology() != null && !link.technology().isBlank()) {
            qualifiers.add(link.technology());
        }
        qualifiers.addAll(link.tags());
        if (!qualifiers.isEmpty()) {
            val array = node.putArray("qualifiers");
            qualifiers.forEach(array::add);
        }
        val tags = node.putObject("tags");
        tags.put("likec4.id", link.id());
        if (link.kind() != null && !link.kind().isBlank()) {
            tags.put("likec4.kind", link.kind());
        }
        return node;
    }
}

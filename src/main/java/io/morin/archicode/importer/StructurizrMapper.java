package io.morin.archicode.importer;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.StructurizrModel.Component;
import io.morin.archicode.importer.StructurizrModel.Container;
import io.morin.archicode.importer.StructurizrModel.Link;
import io.morin.archicode.importer.StructurizrModel.Person;
import io.morin.archicode.importer.StructurizrModel.System;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.manifest.ManifestKind;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.val;

/**
 * Maps a Structurizr model to the manifests of an ArchiCode workspace. It is pure: it reads no file, writes none and
 * serializes nothing; the caller serializes what it returns.
 *
 * <p>The id of an element is its name, lowercased, with every run of characters outside {@code [a-z0-9_-]} replaced by one
 * {@code _} and trimmed of {@code _}. A name with no letter and no digit takes the fallback {@code <kind>_<structurizr id>},
 * through the same rewrite, so no id, and no file name, holds anything but {@code [a-z0-9_.-]}. Siblings are all the elements
 * under one parent, whatever their kind; a collision takes the first suffix {@code _2}, {@code _3}, ... that no sibling holds
 * as its own id, in the order of the export.
 *
 * <p>A <em>rewritten id</em> is one where a character other than an ASCII letter, a digit, {@code _}, {@code -} or a space
 * was replaced, or where the fallback was taken, or where a suffix was added. Case and spaces turned to {@code _} are not a
 * rewrite. Each rewritten id is one sentence of {@link Mapped#rewrites()}.
 */
public final class StructurizrMapper {

    /** The tags Structurizr gives to every element of a kind: they say nothing the author wrote. */
    private static final Set<String> DEFAULT_TAGS = Set.of(
        "Element",
        "Person",
        "Software System",
        "Container",
        "Component"
    );

    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;

    private StructurizrMapper() {}

    /**
     * A manifest and the path, relative to the workspace folder, where it is written.
     *
     * @param path     {@code manifests/<reference>.yaml}
     * @param manifest the manifest
     */
    public record Planned(String path, Manifest manifest) {}

    /**
     * The content of {@code .archicode.yaml}: the part of the settings the import writes.
     *
     * @param settings the settings
     */
    public record WorkspaceFile(Settings settings) {
        /**
         * The settings.
         *
         * @param name      the name of the workspace
         * @param manifests where the manifests are
         */
        public record Settings(String name, Manifests manifests) {}

        /**
         * The folders of the manifests.
         *
         * @param paths the paths, relative to the workspace file
         */
        public record Manifests(List<String> paths) {}
    }

    /**
     * What the mapping gives.
     *
     * @param manifests            the manifests, parents before their children, in the order of the export
     * @param workspace            the content of {@code .archicode.yaml}
     * @param elements             the number of elements written
     * @param relationships        the number of relationships written
     * @param droppedRelationships the relationships whose source or destination is not an imported element
     * @param rewrites             one sentence per rewritten id, in the order of the elements
     */
    public record Mapped(
        List<Planned> manifests,
        WorkspaceFile workspace,
        int elements,
        int relationships,
        int droppedRelationships,
        List<String> rewrites
    ) {}

    /** An element of any level, as the mapper walks it. */
    private record Item(
        ManifestKind kind,
        String sid,
        String name,
        String description,
        String technology,
        List<String> tags,
        String group,
        List<Item> children
    ) {}

    /** An element with the id and the reference it is given. */
    private record Placed(Item item, String parent, String reference, String id) {}

    /**
     * Map a model.
     *
     * @param model the model the reader gave
     * @param file  the name of the file read, the name of the workspace when the export has none
     * @return the manifests and the report of the mapping
     * @throws ArchiCodeException when an element has no name
     */
    public static Mapped map(StructurizrModel model, String file) {
        val roots = new ArrayList<Item>();
        for (val person : model.people()) {
            roots.add(item(person));
        }
        for (val system : model.systems()) {
            roots.add(item(system));
        }
        // pass 1: the id and the reference of every element, and the map the relationships are resolved with
        val placed = new ArrayList<Placed>();
        val rewrites = new ArrayList<String>();
        place(null, roots, placed, rewrites);
        val references = new HashMap<String, String>();
        for (val p : placed) {
            references.put(p.item().sid(), p.reference());
        }
        // pass 2: the relationships, written on their source
        val bySource = new LinkedHashMap<String, List<ObjectNode>>();
        var written = 0;
        var dropped = 0;
        for (val link : model.links()) {
            val source = references.get(link.sourceId());
            val destination = references.get(link.destinationId());
            if (source == null || destination == null) {
                dropped++;
                continue;
            }
            bySource.computeIfAbsent(link.sourceId(), key -> new ArrayList<>()).add(relationship(link, destination));
            written++;
        }
        // pass 3: the manifests
        val planned = new ArrayList<Planned>();
        for (val p : placed) {
            planned.add(
                new Planned(
                    "manifests/" + p.reference() + ".yaml",
                    manifest(p, bySource.getOrDefault(p.item().sid(), List.of()))
                )
            );
        }
        val name = model.name() == null || model.name().isBlank() ? file : model.name();
        val workspace = new WorkspaceFile(
            new WorkspaceFile.Settings(name, new WorkspaceFile.Manifests(List.of("manifests/**")))
        );
        return new Mapped(List.copyOf(planned), workspace, placed.size(), written, dropped, List.copyOf(rewrites));
    }

    private static Item item(Person person) {
        return new Item(
            ManifestKind.PERSON,
            person.id(),
            person.name(),
            person.description(),
            null,
            person.tags(),
            person.group(),
            List.of()
        );
    }

    private static Item item(System system) {
        val children = new ArrayList<Item>();
        for (val container : system.containers()) {
            children.add(item(container));
        }
        return new Item(
            ManifestKind.SYSTEM,
            system.id(),
            system.name(),
            system.description(),
            null,
            system.tags(),
            system.group(),
            children
        );
    }

    private static Item item(Container container) {
        val children = new ArrayList<Item>();
        for (val component : container.components()) {
            children.add(item(component));
        }
        return new Item(
            ManifestKind.CONTAINER,
            container.id(),
            container.name(),
            container.description(),
            container.technology(),
            container.tags(),
            container.group(),
            children
        );
    }

    private static Item item(Component component) {
        return new Item(
            ManifestKind.COMPONENT,
            component.id(),
            component.name(),
            component.description(),
            component.technology(),
            component.tags(),
            component.group(),
            List.of()
        );
    }

    /** Give an id to each of the siblings, then go down, parents before children. */
    private static void place(String parent, List<Item> siblings, List<Placed> placed, List<String> rewrites) {
        val bases = new ArrayList<String>();
        val rewritten = new ArrayList<Boolean>();
        // every id a sibling asks for is taken before a suffix is chosen, so a suffix never shadows a sibling
        val taken = new HashSet<String>();
        for (val sibling : siblings) {
            if (sibling.name() == null || sibling.name().isBlank()) {
                throw new ArchiCodeException(
                    "a %s has no name (id %s)",
                    sibling.kind().getSubTypeName(),
                    sibling.sid()
                );
            }
            var base = slug(sibling.name());
            var changed = replacesCharacter(sibling.name());
            if (!hasAlphanumeric(base)) {
                base = slug(sibling.kind().getSubTypeName() + "_" + sibling.sid());
                changed = true;
            }
            bases.add(base);
            rewritten.add(changed);
            taken.add(base);
        }
        val used = new HashSet<String>();
        for (var i = 0; i < siblings.size(); i++) {
            val sibling = siblings.get(i);
            var id = bases.get(i);
            var changed = rewritten.get(i);
            if (!used.add(id)) {
                var suffix = 2;
                while (taken.contains(id + "_" + suffix) || used.contains(id + "_" + suffix)) {
                    suffix++;
                }
                id = id + "_" + suffix;
                used.add(id);
                changed = true;
            }
            val reference = parent == null ? id : parent + "." + id;
            placed.add(new Placed(sibling, parent, reference, id));
            if (changed) {
                rewrites.add(
                    String.format(
                        "the id of the %s \"%s\" (Structurizr id %s) is written as %s",
                        sibling.kind().getSubTypeName(),
                        sibling.name(),
                        sibling.sid(),
                        id
                    )
                );
            }
            place(reference, sibling.children(), placed, rewrites);
        }
    }

    /** The name lowercased, each run of characters outside {@code [a-z0-9_-]} one {@code _}, trimmed of {@code _}. */
    private static String slug(String text) {
        val lower = text.toLowerCase(Locale.ROOT);
        val out = new StringBuilder();
        var inRun = false;
        for (var i = 0; i < lower.length(); i++) {
            val c = lower.charAt(i);
            if (isIdCharacter(c)) {
                out.append(c);
                inRun = false;
            } else if (!inRun) {
                out.append('_');
                inRun = true;
            }
        }
        var start = 0;
        var end = out.length();
        while (start < end && out.charAt(start) == '_') {
            start++;
        }
        while (end > start && out.charAt(end - 1) == '_') {
            end--;
        }
        return out.substring(start, end);
    }

    private static boolean isIdCharacter(char c) {
        return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-';
    }

    /** True when a character other than an ASCII letter, a digit, {@code _}, {@code -} or a space is replaced. */
    private static boolean replacesCharacter(String name) {
        for (val c : name.toLowerCase(Locale.ROOT).toCharArray()) {
            if (!isIdCharacter(c) && c != ' ') {
                return true;
            }
        }
        return false;
    }

    private static boolean hasAlphanumeric(String id) {
        for (val c : id.toCharArray()) {
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
                return true;
            }
        }
        return false;
    }

    private static Manifest manifest(Placed placed, List<ObjectNode> relationships) {
        val item = placed.item();
        val content = JSON.objectNode();
        content.put("id", placed.id());
        content.put("name", item.name());
        if (item.description() != null && !item.description().isBlank()) {
            content.put("description", item.description());
        }
        val qualifiers = new LinkedHashSet<String>();
        if (item.technology() != null && !item.technology().isBlank()) {
            qualifiers.add(item.technology());
        }
        for (val tag : item.tags()) {
            if (!DEFAULT_TAGS.contains(tag)) {
                qualifiers.add(tag);
            }
        }
        if (!qualifiers.isEmpty()) {
            val array = content.putArray("qualifiers");
            qualifiers.forEach(array::add);
        }
        val tags = content.putObject("tags");
        tags.put("structurizr.id", item.sid());
        if (item.group() != null && !item.group().isBlank()) {
            tags.put("group", item.group());
        }
        if (!relationships.isEmpty()) {
            val array = content.putArray("relationships");
            relationships.forEach(array::add);
        }
        return Manifest.builder()
            .header(Manifest.Header.builder().kind(item.kind()).version("1").parent(placed.parent()).build())
            .content(content)
            .build();
    }

    private static ObjectNode relationship(Link link, String destination) {
        val node = JSON.objectNode();
        node.put("destination", destination);
        if (link.description() != null && !link.description().isBlank()) {
            node.put("label", link.description());
        }
        if (link.technology() != null && !link.technology().isBlank()) {
            node.putArray("qualifiers").add(link.technology());
        }
        node.putObject("tags").put("structurizr.id", link.id());
        return node;
    }
}

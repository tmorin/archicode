package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.Replaces;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.workspace.ElementIndex;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Predicate;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The elements of a layer as the viewpoint kernel takes them ({@code elements} of {@code compute}, the lists of
 * {@code base} and {@code target} of {@code compare}): one entry per element, in the order of the references.
 */
@UtilityClass
class KernelGraph {

    /**
     * @param index the elements of one layer
     * @param objectMapper to make the nodes
     * @param withProperties also {@code kind}, {@code name}, {@code description} and, when there is one, {@code replaces},
     *                       which the comparison reads and the viewpoints do not
     * @return the elements, with their qualifiers and tags (the kernel tells the stereotypes of an item from them)
     */
    ArrayNode of(ElementIndex index, ObjectMapper objectMapper, boolean withProperties) {
        return of(index, objectMapper, withProperties, reference -> true);
    }

    /**
     * @param index the elements of one layer
     * @param objectMapper to make the nodes
     * @param withProperties also {@code kind}, {@code name}, {@code description} and, when there is one, {@code replaces},
     *                       which the comparison reads and the viewpoints do not
     * @param carriesReplaces whether the {@code replaces} of the element with this reference are given; the other elements
     *                        are given without
     * @return the elements, with their qualifiers and tags (the kernel tells the stereotypes of an item from them)
     */
    ArrayNode of(
        ElementIndex index,
        ObjectMapper objectMapper,
        boolean withProperties,
        Predicate<String> carriesReplaces
    ) {
        val elements = objectMapper.createArrayNode();
        new TreeMap<>(index.elementByReferenceIndex).forEach((reference, element) -> {
            val node = elements.addObject();
            node.put("reference", reference);
            node.put("parent", element instanceof Parent<?>);
            if (withProperties) {
                node.put("kind", Item.Kind.from(element).name().toLowerCase(Locale.ROOT));
                node.put("name", element.getName());
                node.put("description", element.getDescription());
                // as written, so that the kernel warns of a reference listed twice, of an entry that is not a reference and of a
                // value that is not a list; nothing at all for no value or an empty list
                val written = replacesAsWritten(element);
                if (written != null && carriesReplaces.test(reference)) {
                    node.set("replaces", written);
                }
            }
            if (element instanceof Node technologyNode) {
                val applications = node.putArray("applications");
                new TreeSet<>(Optional.ofNullable(technologyNode.getApplications()).orElseGet(Set::of)).forEach(
                    applications::add
                );
            }
            if (element instanceof Environment environment) {
                val uses = node.putArray("uses");
                new TreeSet<>(Optional.ofNullable(environment.getUses()).orElseGet(Set::of)).forEach(uses::add);
            }
            // the kernel tells the stereotypes of the element from its qualifiers and its tags
            val elementQualifiers = node.putArray("qualifiers");
            Optional.ofNullable(element.getQualifiers()).ifPresent(q -> q.forEach(elementQualifiers::add));
            val elementTags = node.putObject("tags");
            Optional.ofNullable(element.getTags()).ifPresent(t -> t.forEach(elementTags::put));
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

    /**
     * What an element says in {@code replaces}, as it was written (a list, or whatever the author wrote instead: the kernel is
     * the one that says it is not a list).
     *
     * @param element an element
     * @return the value, or null when the element says nothing (no key, null, an empty list)
     */
    JsonNode replacesAsWritten(Element element) {
        val replaces = element.getReplaces();
        if (replaces == null) {
            return null;
        }
        if (replaces instanceof Replaces read) {
            val written = read.getWritten();
            return written.isNull() || (written.isArray() && written.isEmpty()) ? null : written;
        }
        if (replaces.isEmpty()) {
            return null;
        }
        val list = JsonNodeFactory.instance.arrayNode();
        replaces.forEach(list::add);
        return list;
    }
}

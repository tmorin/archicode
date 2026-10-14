package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
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
     * @param withProperties also {@code kind}, {@code name} and {@code description}, which the comparison reads and the
     *                       viewpoints do not
     * @return the elements, with their qualifiers and tags (the kernel tells the stereotypes of an item from them)
     */
    ArrayNode of(ElementIndex index, ObjectMapper objectMapper, boolean withProperties) {
        val elements = objectMapper.createArrayNode();
        new TreeMap<>(index.elementByReferenceIndex).forEach((reference, element) -> {
            val node = elements.addObject();
            node.put("reference", reference);
            node.put("parent", element instanceof Parent<?>);
            if (withProperties) {
                node.put("kind", Item.Kind.from(element).name().toLowerCase(Locale.ROOT));
                node.put("name", element.getName());
                node.put("description", element.getDescription());
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
}

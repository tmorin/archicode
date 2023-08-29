package io.morin.archicode.viewpoint;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.workspace.ElementIndex;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Getter
@SuperBuilder
@FieldDefaults(makeFinal = true, level = AccessLevel.PROTECTED)
public abstract class AbstractViewpointFactory {

    @NonNull
    ObjectMapper objectMapper;

    @SafeVarargs
    protected final <T> Set<T> collectAsSet(Stream<T>... streams) {
        val mainItemReferences = new HashSet<T>();
        Arrays.stream(streams).forEach(stream -> mainItemReferences.addAll(stream.collect(Collectors.toSet())));
        return mainItemReferences;
    }

    protected Set<Link> createLinks(Set<MetaLink> allMetaLinks, HashMap<String, Item> itemByReference) {
        return allMetaLinks
            .stream()
            .map(metaLink -> {
                val fromItem = itemByReference.get(metaLink.getFromReference());
                val toItem = itemByReference.get(metaLink.getToReference());
                return Link
                    .builder()
                    .from(fromItem)
                    .to(toItem)
                    .label(metaLink.getRelationship().getLabel())
                    .qualifiers(metaLink.getRelationship().getQualifiers())
                    .relationship(metaLink.getRelationship())
                    .build();
            })
            .collect(Collectors.toSet());
    }

    protected Set<Item> createItems(
        Set<String> itemReferences,
        ElementIndex elementIndex,
        HashMap<String, Item> itemByReference
    ) {
        return itemReferences
            .stream()
            .flatMap(reference -> {
                val references = new HashSet<String>();
                val parts = reference.split("\\.");
                for (int i = 0; i < parts.length; i++) {
                    references.add(String.join(".", Arrays.copyOf(parts, i + 1)));
                }
                return references.stream();
            })
            .distinct()
            .sorted()
            .map(elementReference -> {
                val element = elementIndex.getElementByReference(elementReference);
                val item = itemByReference.computeIfAbsent(
                    elementReference,
                    s ->
                        Item
                            .builder()
                            .itemId(elementReference)
                            .reference(elementReference)
                            .element(element)
                            .kind(Item.Kind.from(element))
                            .build()
                );
                io.morin.archicode.resource.workspace.Workspace.Utilities
                    .findParentReference(elementReference)
                    .ifPresent(parentReference -> itemByReference.get(parentReference).getChildren().add(item));
                return item;
            })
            .filter(item -> !item.getReference().contains("."))
            .collect(Collectors.toSet());
    }
}

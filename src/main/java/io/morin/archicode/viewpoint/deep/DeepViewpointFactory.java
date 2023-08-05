package io.morin.archicode.viewpoint.deep;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.metalink.EgressMetaLinkFinder;
import io.morin.archicode.viewpoint.metalink.IngressMetaLinkFinder;
import io.morin.archicode.viewpoint.metalink.MetaLink;
import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class DeepViewpointFactory {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    EgressMetaLinkFinder egressMetaLinkFinder;
    IngressMetaLinkFinder ingressMetaLinkFinder;

    @SneakyThrows
    public Viewpoint create(Workspace workspace, View view) {
        log.debug("create viewpoint for {}", view);

        val properties = OBJECT_MAPPER.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            DeepViewProperties.class
        );

        val viewReference = properties.getElement();

        val allMetaLinks = Stream
            .concat(
                Stream.of(viewReference),
                workspace.appIndex.streamDescendants(viewReference).map(Map.Entry::getKey)
            )
            .flatMap(reference -> {
                val egressMetaLinks = egressMetaLinkFinder.find(workspace, reference);
                val ingressMetaLinks = ingressMetaLinkFinder.find(workspace, reference);
                return Stream.concat(egressMetaLinks.stream(), ingressMetaLinks.stream());
            })
            .collect(Collectors.toSet());
        allMetaLinks.forEach(metaLink -> log.debug("metaLink {}", metaLink));

        val itemByReference = new HashMap<String, Item>();

        val itemReferences = new HashSet<String>();
        itemReferences.addAll(allMetaLinks.stream().map(MetaLink::getFromReference).collect(Collectors.toSet()));
        itemReferences.addAll(allMetaLinks.stream().map(MetaLink::getToReference).collect(Collectors.toSet()));
        if (itemReferences.isEmpty()) {
            itemReferences.add(viewReference);
        }

        val items = itemReferences
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
                val element = workspace.appIndex.getElementByReference(elementReference);
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
        items.forEach(item -> log.debug("item {}", item));

        val links = allMetaLinks
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
        links.forEach(link -> log.debug("link {}", link));

        return Viewpoint.builder().workspace(workspace).view(view).items(items).links(links).build();
    }
}

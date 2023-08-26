package io.morin.archicode.viewpoint.deep;

import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.*;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@SuperBuilder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class DeepViewpointFactory extends AbstractViewpointFactory implements ViewpointFactory {

    @NonNull
    MetaLinkFinderForEgress metaLinkFinderForEgress;

    @NonNull
    MetaLinkFinderForIngress metaLinkFinderForIngress;

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create viewpoint for {}", view);

        val mainIndex = workspace.resolveMainIndexForView(view);

        val properties = objectMapper.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            DeepViewProperties.class
        );

        val viewReference = properties.getElement();

        val allMetaLinks = listAllMetaLinksRelatedToViewReference(mainIndex, viewReference);

        val mainItemReferences = collectAsSet(
            allMetaLinks.stream().map(MetaLink::getFromReference),
            allMetaLinks.stream().map(MetaLink::getToReference),
            Stream.of(viewReference)
        );

        val mainContent = createItemAndLinksForCurrentLayer(mainItemReferences, mainIndex, allMetaLinks);
        val allItems = new HashSet<>(mainContent.items);
        val allLinks = new HashSet<>(mainContent.links);

        val appContent = createItemAndLinksForAppLayer(workspace, mainContent.items);
        allLinks.addAll(appContent.links);

        return Viewpoint.builder().workspace(workspace).view(view).items(allItems).links(allLinks).build();
    }

    private Set<MetaLink> listAllMetaLinksRelatedToViewReference(ElementIndex mainIndex, String viewReference) {
        val allMetaLinks = Stream
            .concat(Stream.of(viewReference), mainIndex.streamDescendants(viewReference).map(Map.Entry::getKey))
            .flatMap(reference -> {
                val egressMetaLinks = metaLinkFinderForEgress.find(mainIndex, reference);
                val ingressMetaLinks = metaLinkFinderForIngress.find(mainIndex, reference);
                return Stream.concat(egressMetaLinks.stream(), ingressMetaLinks.stream());
            })
            .collect(Collectors.toSet());
        allMetaLinks.forEach(metaLink -> log.debug("metaLink {}", metaLink));
        return allMetaLinks;
    }

    @SneakyThrows
    private Content createItemAndLinksForCurrentLayer(
        Set<String> mainItemReferences,
        ElementIndex mainIndex,
        Set<MetaLink> allMetaLinks
    ) {
        val content = new Content();

        val mainItemByReference = new HashMap<String, Item>();

        val mainItems = createItems(mainItemReferences, mainIndex, mainItemByReference);
        mainItems.forEach(item -> log.debug("mainItem {}", item));
        content.items.addAll(mainItems);

        val mainLinks = createLinks(allMetaLinks, mainItemByReference);
        mainLinks.forEach(link -> log.debug("mainLink {}", link));
        content.links.addAll(mainLinks);

        return content;
    }

    private Content createItemAndLinksForAppLayer(Workspace workspace, Set<Item> mainItemByReference) {
        val content = new Content();

        // the map is used to keep track of the app items created by reference
        val appItemByReference = new HashMap<String, Set<Item>>();

        // discover and collect all items of the application layer
        val appItems = mainItemByReference
            .stream()
            .flatMap(Item::stream)
            .filter(i -> i.getElement() instanceof Node)
            .flatMap(item -> {
                val node = (Node) item.getElement();
                return node
                    .getApplications()
                    .stream()
                    .map(reference -> {
                        val appElement = workspace.appIndex.elementByReferenceIndex.get(reference);
                        val newAppItem = Item
                            .builder()
                            .itemId(node.getId() + "_" + reference.replace(".", "_"))
                            .reference("app:" + reference.replace(".", "_"))
                            .element(appElement)
                            .kind(Item.Kind.from(appElement))
                            .build();
                        appItemByReference.putIfAbsent(reference, new HashSet<>());
                        appItemByReference.get(reference).add(newAppItem);
                        item.getChildren().add(newAppItem);
                        return newAppItem;
                    });
            })
            .collect(Collectors.toSet());
        appItems.forEach(item -> log.debug("appItem {}", item));
        content.items.addAll(appItems);

        // discover and collect all links related to the item of the application layer
        val appLinks = appItemByReference
            .entrySet()
            .stream()
            .flatMap(entry ->
                entry
                    .getValue()
                    .stream()
                    .flatMap(fromItem ->
                        fromItem
                            .getElement()
                            .getRelationships()
                            .stream()
                            .filter(relationship -> appItemByReference.containsKey(relationship.getDestination()))
                            .flatMap(relationship ->
                                appItemByReference
                                    .get(relationship.getDestination())
                                    .stream()
                                    .map(toItem ->
                                        Link
                                            .builder()
                                            .from(fromItem)
                                            .to(toItem)
                                            .tags(Map.of("rendering-secondary", "no"))
                                            .build()
                                    )
                            )
                    )
            )
            .collect(Collectors.toSet());
        appLinks.forEach(link -> log.debug("appLink {}", link));
        content.links.addAll(appLinks);

        return content;
    }

    private record Content(Set<Item> items, Set<Link> links) {
        public Content() {
            this(new HashSet<>(), new HashSet<>());
        }
    }
}

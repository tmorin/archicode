package io.morin.archicode.viewpoint.deep;

import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.*;
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
public class TechnologyDeepViewpointFactory extends ApplicationDeepViewpointFactory implements ViewpointFactory {

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create technology viewpoint for {}", view);

        val techIndex = workspace.resolveMainIndexForView(view);

        val properties = objectMapper.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            DeepViewProperties.class
        );

        val viewReference = properties.getElement();

        val allMetaLinks = listAllMetaLinksRelatedToViewReference(techIndex, viewReference);

        val techItemReferences = collectAsSet(
            allMetaLinks.stream().map(MetaLink::getFromReference),
            allMetaLinks.stream().map(MetaLink::getToReference),
            Stream.of(viewReference)
        );

        // create items and links for the technology layer
        val techContent = createItemAndLinksForCurrentLayer(techItemReferences, techIndex, allMetaLinks);
        val allItems = new HashSet<>(techContent.items());
        val allLinks = new HashSet<>(techContent.links());

        // create items and links for the application layer
        val appContent = createItemAndLinksForAppLayer(workspace, techContent.items());
        allLinks.addAll(appContent.links());

        return Viewpoint.builder().workspace(workspace).view(view).items(allItems).links(allLinks).build();
    }

    private Content createItemAndLinksForAppLayer(Workspace workspace, Set<Item> techItems) {
        val appContent = new Content();

        // the map is used to keep track of the app items created by reference
        val appItemByReference = new HashMap<String, Set<Item>>();

        // discover and collect all items of the application layer
        val appItems = techItems
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
                        val newAppItem = Item.builder()
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
        appContent.items().addAll(appItems);

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
                                        Link.builder()
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
        appContent.links().addAll(appLinks);

        return appContent;
    }
}

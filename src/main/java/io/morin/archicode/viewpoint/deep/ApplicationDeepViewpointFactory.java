package io.morin.archicode.viewpoint.deep;

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
public class ApplicationDeepViewpointFactory extends AbstractViewpointFactory implements ViewpointFactory {

    @NonNull
    protected final MetaLinkFinderForEgress metaLinkFinderForEgress;

    @NonNull
    protected final MetaLinkFinderForIngress metaLinkFinderForIngress;

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create application viewpoint for {}", view);

        val appIndex = workspace.resolveMainIndexForView(view);

        val properties = objectMapper.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            DeepViewProperties.class
        );

        val viewReference = properties.getElement();

        val allMetaLinks = listAllMetaLinksRelatedToViewReference(appIndex, viewReference);

        val mainItemReferences = collectAsSet(
            allMetaLinks.stream().map(MetaLink::getFromReference),
            allMetaLinks.stream().map(MetaLink::getToReference),
            Stream.of(viewReference)
        );

        val content = createItemAndLinksForCurrentLayer(mainItemReferences, appIndex, allMetaLinks);
        val allItems = new HashSet<>(content.items);
        val allLinks = new HashSet<>(content.links);

        return Viewpoint.builder().workspace(workspace).view(view).items(allItems).links(allLinks).build();
    }

    protected Set<MetaLink> listAllMetaLinksRelatedToViewReference(ElementIndex elementIndex, String viewReference) {
        val allMetaLinks = Stream.concat(
            Stream.of(viewReference),
            elementIndex.streamDescendants(viewReference).map(Map.Entry::getKey)
        )
            .flatMap(reference -> {
                val egressMetaLinks = metaLinkFinderForEgress.find(elementIndex, reference);
                val ingressMetaLinks = metaLinkFinderForIngress.find(elementIndex, reference);
                return Stream.concat(egressMetaLinks.stream(), ingressMetaLinks.stream());
            })
            .collect(Collectors.toSet());
        allMetaLinks.forEach(metaLink -> log.debug("metaLink {}", metaLink));
        return allMetaLinks;
    }

    @SneakyThrows
    protected Content createItemAndLinksForCurrentLayer(
        Set<String> itemReferences,
        ElementIndex elementIndex,
        Set<MetaLink> allMetaLinks
    ) {
        val content = new Content();

        val itemByReference = new HashMap<String, Item>();

        val items = createItems(itemReferences, elementIndex, itemByReference);
        items.forEach(item -> log.debug("mainItem {}", item));
        content.items.addAll(items);

        val links = createLinks(allMetaLinks, itemByReference);
        links.forEach(link -> log.debug("mainLink {}", link));
        content.links.addAll(links);

        return content;
    }

    protected record Content(Set<Item> items, Set<Link> links) {
        public Content() {
            this(new HashSet<>(), new HashSet<>());
        }
    }
}

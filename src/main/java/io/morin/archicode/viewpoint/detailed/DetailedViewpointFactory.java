package io.morin.archicode.viewpoint.detailed;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.*;
import io.morin.archicode.viewpoint.overview.OverviewViewpointFactory;
import io.morin.archicode.workspace.Workspace;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
public class DetailedViewpointFactory extends AbstractViewpointFactory implements ViewpointFactory {

    @NonNull
    OverviewViewpointFactory overviewViewpointFactory;

    private static void mergeCandidateItem(@NonNull Set<Item> finalItemSet, @NonNull Item candidateItem) {
        log.debug("{} candidate item", candidateItem.getItemId());

        val optionalFinalItem = finalItemSet
            .stream()
            .filter(c -> c.getItemId().equals(candidateItem.getItemId()))
            .findFirst();

        if (optionalFinalItem.isEmpty()) {
            log.debug("{} add candidate item", candidateItem.getItemId());
            finalItemSet.add(candidateItem);
        }

        optionalFinalItem.ifPresent(finalItem ->
            candidateItem
                .getChildren()
                .forEach(candidateChild -> mergeCandidateItem(finalItem.getChildren(), candidateChild))
        );
    }

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create viewpoint for {}", view);

        val mainIndex = workspace.resolveMainIndexForView(view);

        val properties = objectMapper.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            DetailedViewProperties.class
        );

        val parentCandidate = mainIndex.getElementByReference(properties.getElement());

        // leave early if the element of the view is not a parent
        // because there is nothing inside to inspect
        if (!(parentCandidate instanceof Parent<?> parent)) {
            throw new ArchiCodeException("the element %s is not a parent one", parentCandidate);
        }

        // foreach child of the view item, an Overview View is built
        // this lead to one Context by children of the Detailed View element
        val childContexts = parent
            .getElements()
            .stream()
            .map(mainIndex::getReferenceByElement)
            .map(reference ->
                overviewViewpointFactory.create(
                    workspace,
                    View
                        .builder()
                        .viewpoint("overview")
                        .layer(view.getLayer())
                        .id(UUID.randomUUID().toString())
                        .properties(objectMapper.createObjectNode().put("element", reference))
                        .build()
                )
            )
            .collect(Collectors.toSet());

        // the children's Overview Views are merged to get:
        // - a list of all items (with the respected hierarchy)
        // - a list of all links between the sources (the view's item + its children) and the destination
        val allItems = new HashSet<Item>();
        val allLinks = new HashSet<Link>();
        for (Viewpoint childViewpoint : childContexts) {
            // merge all items
            childViewpoint.getItems().forEach(candidateItem -> mergeCandidateItem(allItems, candidateItem));
            // merge all links
            allLinks.addAll(childViewpoint.getLinks());
        }

        return Viewpoint.builder().workspace(workspace).view(view).items(allItems).links(allLinks).build();
    }
}

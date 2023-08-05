package io.morin.archicode.viewpoint.detailed;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.overview.OverviewViewpointFactory;
import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.*;
import java.util.stream.Collectors;
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
public class DetailedViewpointFactory {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    OverviewViewpointFactory contextFactory;

    private static void mergeCandidateItem(HashMap<String, Item> cache, Set<Item> finalChildren, Item candidateItem) {
        if (!cache.containsKey(candidateItem.getItemId())) {
            // the candidate item is not yet handled
            cache.put(candidateItem.getItemId(), candidateItem);
            // therefore the candidate's children must be handled as well
            finalChildren.add(candidateItem);
        } else {
            // the candidate item is already handled
            val finalItem = cache.get(candidateItem.getReference());
            // but the candidate's children are maybe not yet handled
            candidateItem
                .getChildren()
                .forEach(candidateChild -> mergeCandidateItem(cache, finalItem.getChildren(), candidateChild));
        }
    }

    @SneakyThrows
    public Viewpoint create(Workspace workspace, View view) {
        log.debug("create viewpoint for {}", view);

        val properties = OBJECT_MAPPER.readValue(
            Objects.requireNonNull(view.getProperties().toString()),
            DetailedViewProperties.class
        );

        val parentCandidate = workspace.appIndex.getElementByReference(properties.getElement());

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
            .map(workspace.appIndex::getReferenceByElement)
            .map(reference ->
                contextFactory.create(
                    workspace,
                    View
                        .builder()
                        .viewpoint("overview")
                        .viewId(UUID.randomUUID().toString())
                        .properties(OBJECT_MAPPER.createObjectNode().put("element", reference))
                        .build()
                )
            )
            .collect(Collectors.toSet());

        // the children's Overview Views are merged to get:
        // - a list of all items (with the respected hierarchy)
        // - a list of all links between the sources (the view's item + its children) and the destination
        val cache = new HashMap<String, Item>();
        val allItems = new HashSet<Item>();
        val allLinks = new HashSet<Link>();
        for (Viewpoint childViewpoint : childContexts) {
            childViewpoint.getItems().forEach(candidateItem -> mergeCandidateItem(cache, allItems, candidateItem));
            allLinks.addAll(childViewpoint.getLinks());
        }

        return Viewpoint.builder().workspace(workspace).view(view).items(allItems).links(allLinks).build();
    }
}

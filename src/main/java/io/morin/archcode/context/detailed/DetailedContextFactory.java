package io.morin.archcode.context.detailed;

import io.morin.archcode.ArchcodeException;
import io.morin.archcode.context.Context;
import io.morin.archcode.context.Item;
import io.morin.archcode.context.Link;
import io.morin.archcode.context.overview.OverviewContextFactory;
import io.morin.archcode.element.application.Parent;
import io.morin.archcode.view.DetailedView;
import io.morin.archcode.view.OverviewView;
import io.morin.archcode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class DetailedContextFactory {

    OverviewContextFactory contextFactory;

    public Context create(Workspace workspace, DetailedView view) {
        log.info("create context for {}", view);

        val parentCandidate = workspace.getElementByReference(view.getElement());

        // leave early if the element of the view is not a parent
        // because there is nothing inside to inspect
        if (!(parentCandidate instanceof Parent<?> parent)) {
            throw new ArchcodeException("the element %s is not a parent one", parentCandidate);
        }

        // foreach child of the view item, an Overview View is built
        // this lead to one Context by children of the Detailed View element
        val childContexts = parent
            .getElements()
            .stream()
            .map(workspace::getReferenceByElement)
            .map(reference ->
                contextFactory.create(
                    workspace,
                    OverviewView.builder().element(reference).viewId(UUID.randomUUID().toString()).build()
                )
            )
            .collect(Collectors.toSet());

        // the children's Overview Views are merged to get:
        // - a list of all items (with the respected hierarchy)
        // - a list of all links between the sources (the view's item + its children) and the destination
        val cache = new HashMap<String, Item>();
        val allItems = new HashSet<Item>();
        val allLinks = new HashSet<Link>();
        for (Context childContext : childContexts) {
            childContext.getItems().forEach(candidateItem -> mergeCandidateItem(cache, allItems, candidateItem));
            allLinks.addAll(childContext.getLinks());
        }

        return Context.builder().workspace(workspace).view(view).items(allItems).links(allLinks).build();
    }

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
}

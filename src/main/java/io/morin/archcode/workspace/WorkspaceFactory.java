package io.morin.archcode.workspace;

import io.morin.archcode.element.Element;
import io.morin.archcode.view.View;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.util.*;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class WorkspaceFactory {

    WorkspaceMapperFactory workspaceMapperFactory;

    @SneakyThrows
    public Workspace create(RawWorkspace rawWorkspace) {
        val sourceElementsByDestinationIndex = new HashMap<String, Set<Element>>();
        val elementByReferenceIndex = new HashMap<String, Element>();
        val referenceByElementIndex = new HashMap<Element, String>();

        Workspace.Utilities.walkDown(
            rawWorkspace.getApplication(),
            (parent, element) -> {
                Optional
                    .ofNullable(parent)
                    .ifPresentOrElse(
                        p -> {
                            val parentReference = referenceByElementIndex.get(p);
                            val elementReference = String.format("%s.%s", parentReference, element.getId());
                            elementByReferenceIndex.put(elementReference, element);
                            referenceByElementIndex.put(element, elementReference);
                        },
                        () -> {
                            elementByReferenceIndex.put(element.getId(), element);
                            referenceByElementIndex.put(element, element.getId());
                        }
                    );
                Optional
                    .ofNullable(element.getRelationships())
                    .orElse(Collections.emptySet())
                    .forEach(relationship -> {
                        sourceElementsByDestinationIndex.putIfAbsent(relationship.getDestination(), new HashSet<>());
                        sourceElementsByDestinationIndex.get(relationship.getDestination()).add(element);
                    });
            }
        );

        val viewByViewIdIndex = new HashMap<String, View>();
        rawWorkspace.getViews().forEach(view -> viewByViewIdIndex.put(view.getViewId(), view));

        return Workspace
            .builder()
            .rawWorkspace(rawWorkspace)
            .sourceElementsByDestinationIndex(sourceElementsByDestinationIndex)
            .elementByReferenceIndex(elementByReferenceIndex)
            .referenceByElementIndex(referenceByElementIndex)
            .viewByViewIdIndex(viewByViewIdIndex)
            .build();
    }

    @SneakyThrows
    public Workspace create(Path path) {
        val workspaceMapper = workspaceMapperFactory.create(path);
        val rawWorkspace = workspaceMapper.readValue(path.toFile(), RawWorkspace.class);
        return create(rawWorkspace);
    }
}

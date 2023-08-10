package io.morin.archicode.viewpoint;

import static io.morin.archicode.resource.workspace.Workspace.Utilities.isDescendantOf;
import static io.morin.archicode.resource.workspace.Workspace.Utilities.isSiblingOf;

import io.morin.archicode.workspace.ElementIndex;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class MetaLinkFinderForIngress implements MetaLinkFinder {

    @Override
    public Set<MetaLink> find(@NonNull ElementIndex index, @NonNull String toReference) {
        val fromElements = index.searchFromElements(toReference);
        return fromElements
            .stream()
            .flatMap(fromElement -> {
                val fromReference = index.getReferenceByElement(fromElement);
                val fromLevel = Level.from(fromReference);
                return fromElement
                    .getRelationships()
                    .stream()
                    .filter(relationship ->
                        isDescendantOf(relationship.getDestination(), toReference) ||
                        isSiblingOf(relationship.getDestination(), toReference)
                    )
                    .map(relationship -> {
                        val toElement = index.getElementByReference(relationship.getDestination());
                        val toLevel = Level.from(relationship.getDestination());
                        return MetaLink
                            .builder()
                            .fromReference(fromReference)
                            .fromElement(fromElement)
                            .fromLevel(fromLevel)
                            .toReference(relationship.getDestination())
                            .toElement(toElement)
                            .toLevel(toLevel)
                            .relationship(relationship)
                            .build();
                    });
            })
            //.filter(metaLink -> !metaLink.getFromReference().startsWith(toReference))
            .filter(metaLink -> !isDescendantOf(metaLink.getFromReference(), toReference))
            .collect(Collectors.toSet());
    }
}

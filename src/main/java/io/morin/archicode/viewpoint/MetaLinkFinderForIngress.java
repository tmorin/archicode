package io.morin.archicode.viewpoint;

import static io.morin.archicode.resource.workspace.Workspace.Utilities.isDescendantOf;

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

    /**
     * Find all associations where the reference or one of its descendant is the destination of a relationship.
     *
     * @param index       the index
     * @param toReference the reference
     * @return the result
     */
    @Override
    public Set<MetaLink> find(@NonNull ElementIndex index, @NonNull String toReference) {
        return index
            .searchFromElements(toReference)
            .stream()
            .flatMap(fromElement -> {
                val fromReference = index.getReferenceByElement(fromElement);

                val fromLevel = Level.from(fromReference);

                return fromElement
                    .getRelationships()
                    .stream()
                    .filter(
                        relationship ->
                            relationship.getDestination().equals(toReference) ||
                            isDescendantOf(relationship.getDestination(), toReference)
                    )
                    .map(relationship -> {
                        val toElement = index.getElementByReference(relationship.getDestination());
                        val toLevel = Level.from(relationship.getDestination());
                        return MetaLink.builder()
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
            .filter(metaLink -> !isDescendantOf(metaLink.getFromReference(), toReference))
            .collect(Collectors.toSet());
    }
}

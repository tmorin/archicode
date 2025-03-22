package io.morin.archicode.viewpoint;

import static io.morin.archicode.resource.workspace.Workspace.Utilities.isDescendantOf;

import io.morin.archicode.workspace.ElementIndex;
import java.util.HashSet;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class MetaLinkFinderForEgress implements MetaLinkFinder {

    /**
     * Find all associations where the reference or one of its descendant is the source of a relationship.
     *
     * @param index         the index
     * @param viewReference the reference
     * @return the result
     */
    @Override
    public Set<MetaLink> find(@NonNull ElementIndex index, @NonNull String viewReference) {
        val metaLinks = new HashSet<MetaLink>();
        val rootElement = index.getElementByReference(viewReference);

        io.morin.archicode.resource.workspace.Workspace.Utilities.walkDown(rootElement, fromElement -> {
            val fromReference = index.getReferenceByElement(fromElement);
            val fromLevel = Level.from(fromReference);

            fromElement
                .getRelationships()
                .stream()
                .filter(relationship -> !isDescendantOf(relationship.getDestination(), viewReference))
                .map(relationship -> {
                    val toReference = relationship.getDestination();
                    val toElement = index.getElementByReference(toReference);
                    val toLevel = Level.from(toReference);
                    return MetaLink.builder()
                        .fromReference(fromReference)
                        .fromElement(fromElement)
                        .fromLevel(fromLevel)
                        .toReference(toReference)
                        .toElement(toElement)
                        .toLevel(toLevel)
                        .relationship(relationship)
                        .build();
                })
                .forEach(metaLinks::add);
        });
        return metaLinks;
    }
}

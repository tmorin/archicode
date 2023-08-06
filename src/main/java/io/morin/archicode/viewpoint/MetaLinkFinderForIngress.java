package io.morin.archicode.viewpoint;

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
                    .filter(relationship -> relationship.getDestination().startsWith(toReference))
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
            .filter(metaLink -> !metaLink.getFromReference().startsWith(toReference))
            .collect(Collectors.toSet());
    }
}

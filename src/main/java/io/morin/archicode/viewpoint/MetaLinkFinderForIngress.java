package io.morin.archicode.viewpoint;

import io.morin.archicode.workspace.Workspace;
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
    public Set<MetaLink> find(@NonNull Workspace workspace, @NonNull String toReference) {
        val fromElements = workspace.appIndex.searchFromElements(toReference);
        return fromElements
            .stream()
            .flatMap(fromElement -> {
                val fromReference = workspace.appIndex.getReferenceByElement(fromElement);
                val fromLevel = Level.from(fromReference);
                return fromElement
                    .getRelationships()
                    .stream()
                    .filter(relationship -> relationship.getDestination().startsWith(toReference))
                    .map(relationship -> {
                        val toElement = workspace.appIndex.getElementByReference(relationship.getDestination());
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

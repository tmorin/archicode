package io.morin.archcode.context.overview;

import io.morin.archcode.context.Level;
import io.morin.archcode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Set;
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
public class IngressMetaLinkFinder implements MetaLinkFinder {

    @Override
    public Set<MetaLink> find(Workspace workspace, String toReference) {
        val fromElements = workspace.searchFromElements(toReference);
        return fromElements
            .stream()
            .flatMap(fromElement -> {
                val fromReference = workspace.getReferenceByElement(fromElement);
                val fromLevel = Level.from(fromReference);
                return fromElement
                    .getRelationships()
                    .stream()
                    .filter(relationship -> relationship.getDestination().startsWith(toReference))
                    .map(relationship -> {
                        val toElement = workspace.getElementByReference(relationship.getDestination());
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

package io.morin.archicode.viewpoint;

import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class EgressMetaLinkFinder implements MetaLinkFinder {

    /**
     * Find all associations where the reference or one of its descendant is the source of a relationship.
     *
     * @param workspace     the resources
     * @param viewReference the reference
     * @return the result
     */
    @Override
    public Set<MetaLink> find(Workspace workspace, String viewReference) {
        val metaLinks = new HashSet<MetaLink>();
        io.morin.archicode.resource.workspace.Workspace.Utilities.walkDown(
            workspace.appIndex.getElementByReference(viewReference),
            fromElement -> {
                val elementMetaLinks = fromElement
                    .getRelationships()
                    .stream()
                    .map(relationship -> {
                        val fromReference = workspace.appIndex.getReferenceByElement(fromElement);
                        val fromLevel = Level.from(fromReference);
                        val toReference = relationship.getDestination();
                        val toElement = workspace.appIndex.getElementByReference(toReference);
                        val toLevel = Level.from(toReference);
                        return MetaLink
                            .builder()
                            .fromReference(fromReference)
                            .fromElement(fromElement)
                            .fromLevel(fromLevel)
                            .toReference(toReference)
                            .toElement(toElement)
                            .toLevel(toLevel)
                            .relationship(relationship)
                            .build();
                    })
                    .filter(metaLink -> !metaLink.getToReference().startsWith(viewReference))
                    .collect(Collectors.toSet());
                metaLinks.addAll(elementMetaLinks);
            }
        );
        return metaLinks;
    }
}

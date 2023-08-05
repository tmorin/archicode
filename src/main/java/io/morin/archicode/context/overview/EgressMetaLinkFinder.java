package io.morin.archicode.context.overview;

import io.morin.archicode.context.Level;
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
     * @param workspace the workspace
     * @param viewReference the reference
     * @return the result
     */
    @Override
    public Set<MetaLink> find(Workspace workspace, String viewReference) {
        val metaLinks = new HashSet<MetaLink>();
        Workspace.Utilities.walkDown(
            workspace.getElementByReference(viewReference),
            fromElement -> {
                val elementMetaLinks = fromElement
                    .getRelationships()
                    .stream()
                    .map(relationship -> {
                        val fromReference = workspace.getReferenceByElement(fromElement);
                        val fromLevel = Level.from(fromReference);
                        val toReference = relationship.getDestination();
                        val toElement = workspace.getElementByReference(toReference);
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
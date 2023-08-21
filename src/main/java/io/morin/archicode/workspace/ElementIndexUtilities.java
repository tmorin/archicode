package io.morin.archicode.workspace;

import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@UtilityClass
@Slf4j
public class ElementIndexUtilities {

    static void index(ManifestParser.Candidate candidate, ElementIndex index) {
        Optional
            .ofNullable(candidate.getParent())
            .ifPresentOrElse(
                p -> {
                    val elementReference = candidate.getReference();
                    val element = candidate.getElement();

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    index.elementByReferenceIndex.put(elementReference, element);
                    index.referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = candidate.getReference();
                    val element = candidate.getElement();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    index.elementByReferenceIndex.put(elementReference, element);
                    index.referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(candidate.getElement().getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                index.sourceElementsByDestinationIndex.putIfAbsent(relationship.getDestination(), new HashSet<>());
                index.sourceElementsByDestinationIndex.get(relationship.getDestination()).add(candidate.getElement());
            });
    }

    static void index(Element parent, Element element, ElementIndex index) {
        Optional
            .ofNullable(parent)
            .ifPresentOrElse(
                p -> {
                    val parentReference = index.referenceByElementIndex.get(p);
                    val elementReference = String.format("%s.%s", parentReference, element.getId());

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    index.elementByReferenceIndex.put(elementReference, element);
                    index.referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = element.getId();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    index.elementByReferenceIndex.put(elementReference, element);
                    index.referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(element.getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                index.sourceElementsByDestinationIndex.putIfAbsent(relationship.getDestination(), new HashSet<>());
                index.sourceElementsByDestinationIndex.get(relationship.getDestination()).add(element);
            });
    }
}

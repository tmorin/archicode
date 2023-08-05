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

    static void index(ManifestParser.Candidate appCandidate, ElementIndex appElementIndex) {
        Optional
            .ofNullable(appCandidate.getParent())
            .ifPresentOrElse(
                p -> {
                    val elementReference = appCandidate.getReference();
                    val element = appCandidate.getElement();

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = appCandidate.getReference();
                    val element = appCandidate.getElement();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(appCandidate.getElement().getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                appElementIndex.sourceElementsByDestinationIndex.putIfAbsent(
                    relationship.getDestination(),
                    new HashSet<>()
                );
                appElementIndex.sourceElementsByDestinationIndex
                    .get(relationship.getDestination())
                    .add(appCandidate.getElement());
            });
    }

    static void index(Element parent, Element element, ElementIndex appElementIndex) {
        Optional
            .ofNullable(parent)
            .ifPresentOrElse(
                p -> {
                    val parentReference = appElementIndex.referenceByElementIndex.get(p);
                    val elementReference = String.format("%s.%s", parentReference, element.getId());

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = element.getId();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(element.getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                appElementIndex.sourceElementsByDestinationIndex.putIfAbsent(
                    relationship.getDestination(),
                    new HashSet<>()
                );
                appElementIndex.sourceElementsByDestinationIndex.get(relationship.getDestination()).add(element);
            });
    }
}

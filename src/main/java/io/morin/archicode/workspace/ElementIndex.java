package io.morin.archicode.workspace;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.Element;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PUBLIC)
public class ElementIndex {

    @NonNull
    @Builder.Default
    Map<String, Set<Element>> sourceElementsByDestinationIndex = new HashMap<>();

    @NonNull
    @Builder.Default
    Map<String, Element> elementByReferenceIndex = new HashMap<>();

    @NonNull
    @Builder.Default
    Map<Element, String> referenceByElementIndex = new HashMap<>();

    public Optional<Element> searchElement(String reference) {
        return Optional.ofNullable(elementByReferenceIndex.get(reference));
    }

    /**
     * Get the element matching the given reference.
     *
     * @param reference the reference
     * @return the element
     */
    public Element getElementByReference(String reference) {
        return searchElement(reference).orElseThrow(() ->
            new ArchiCodeException("unable to find the element %s", reference)
        );
    }

    /**
     * Get the reference of the given element.
     *
     * @param element the element
     * @return the reference
     */
    public String getReferenceByElement(Element element) {
        return referenceByElementIndex.get(element);
    }

    public Set<String> listAllElementReferences(Predicate<Element> predicate) {
        return elementByReferenceIndex
            .entrySet()
            .stream()
            .filter(e -> predicate.test(e.getValue()))
            .map(Map.Entry::getKey)
            .collect(Collectors.toSet());
    }

    /**
     * Select all elements having a relationship matching the destination or being descendants of the destination.
     *
     * @param destination the reference of the destination element
     * @return the matching elements
     */
    public Set<Element> searchFromElements(String destination) {
        return sourceElementsByDestinationIndex
            .entrySet()
            .stream()
            .filter(e -> e.getKey().startsWith(destination))
            .flatMap(e -> e.getValue().stream())
            .collect(Collectors.toSet());
    }

    /**
     * List all descendants of given reference.
     *
     * @param reference the reference
     * @return the descendants
     */
    public Stream<Map.Entry<String, Element>> streamDescendants(String reference) {
        return elementByReferenceIndex.entrySet().stream().filter(e -> e.getKey().startsWith(reference));
    }
}

package io.morin.archicode.workspace;

import io.morin.archicode.ArchicodeException;
import io.morin.archicode.element.Element;
import io.morin.archicode.element.application.Application;
import io.morin.archicode.element.application.ApplicationElement;
import io.morin.archicode.element.application.Parent;
import io.morin.archicode.view.View;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.experimental.Delegate;
import lombok.experimental.FieldDefaults;
import lombok.experimental.UtilityClass;
import lombok.val;

@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Workspace {

    @Delegate
    RawWorkspace rawWorkspace;

    @NonNull
    Map<String, View> viewByViewIdIndex;

    @NonNull
    Map<String, Set<Element>> sourceElementsByDestinationIndex;

    @NonNull
    Map<String, Element> elementByReferenceIndex;

    @NonNull
    Map<Element, String> referenceByElementIndex;

    public Optional<View> searchView(String viewId) {
        return Optional.ofNullable(viewByViewIdIndex.get(viewId));
    }

    public View getView(String viewId) {
        return searchView(viewId).orElseThrow(() -> new ArchicodeException("unable to find the view %s", viewId));
    }

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
        return searchElement(reference)
            .orElseThrow(() -> new ArchicodeException("unable to find the element %s", reference));
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
            .values()
            .stream()
            .filter(predicate)
            .map(referenceByElementIndex::get)
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

    public Optional<String> findParentReference(String reference) {
        val parts = reference.split("\\.");
        if (parts.length == 1) {
            return Optional.empty();
        }
        return Optional.of(String.join(".", Arrays.copyOf(parts, parts.length - 1)));
    }

    @UtilityClass
    public class Utilities {

        public void walkDown(Application application, BiConsumer<Element, Element> consumer) {
            for (ApplicationElement element : application.getElements()) {
                consumer.accept(null, element);
                walkDown(element, consumer);
            }
        }

        private void walkDown(Element element, BiConsumer<Element, Element> consumer) {
            if (element instanceof Parent<?>) {
                for (Element child : ((Parent<?>) element).getElements()) {
                    consumer.accept(element, child);
                    walkDown(child, consumer);
                }
            }
        }

        public void walkDown(Element element, Consumer<Element> consumer) {
            consumer.accept(element);
            if (element instanceof Parent<?>) {
                for (Element child : ((Parent<?>) element).getElements()) {
                    walkDown(child, consumer);
                }
            }
        }
    }
}

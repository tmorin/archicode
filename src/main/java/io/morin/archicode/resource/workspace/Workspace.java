package io.morin.archicode.resource.workspace;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.element.technology.TechnologyElement;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Level;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import lombok.*;
import lombok.experimental.UtilityClass;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder(toBuilder = true)
@Jacksonized
public class Workspace {

    @Builder.Default
    Application application = Application.builder().build();

    @Builder.Default
    Technology technology = Technology.builder().build();

    @Singular
    Set<View> views;

    @Builder.Default
    Settings settings = Settings.builder().build();

    @Builder.Default
    Styles styles = Styles.builder().build();

    @Builder.Default
    Formatters formatters = Formatters.builder().build();

    @UtilityClass
    public static class Utilities {

        /**
         * Split the given reference on the dot.
         *
         * @param reference the reference
         * @return the reference of the parent of the given reference
         */
        private static String[] splitReference(@NonNull String reference) {
            return reference.split("\\.");
        }

        /**
         * Check if the actual parts starts with the expected parts with the respect of the ordering.
         *
         * @param actualParts   the actual
         * @param expectedParts the expected
         * @return true if the actual parts starts with the expected parts with the respect of the ordering
         */
        private static boolean isActualStartWithExpected(String[] actualParts, String[] expectedParts) {
            for (int i = 0; i < expectedParts.length; i++) {
                val candidatePart = actualParts[i];
                val referencePart = expectedParts[i];
                if (!candidatePart.equals(referencePart)) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Check if the candidate is a sibling of the reference.
         *
         * @param candidate the candidate
         * @param reference the reference
         * @return true if the candidate is a sibling of the reference
         */
        public static boolean isSiblingOf(@NonNull String candidate, @NonNull String reference) {
            val candidateParts = splitReference(candidate);
            val referenceParts = splitReference(Level.downReference(reference));
            // leave early if the candidate cannot be an ancestor
            if (candidateParts.length <= referenceParts.length) {
                return false;
            }
            return isActualStartWithExpected(candidateParts, referenceParts);
        }

        /**
         * Check if the candidate is a descendent of the reference.
         *
         * @param candidate the candidate
         * @param reference the reference
         * @return true if the candidate is a descendent of the second one
         */
        public static boolean isDescendantOf(@NonNull String candidate, @NonNull String reference) {
            val candidateParts = splitReference(candidate);
            val referenceParts = splitReference(reference);
            // leave early if the candidate cannot be an ancestor
            if (candidateParts.length <= referenceParts.length) {
                return false;
            }
            return isActualStartWithExpected(candidateParts, referenceParts);
        }

        /**
         * Check if the candidate is an ancestor of the reference.
         *
         * @param candidate the candidate
         * @param reference the reference
         * @return true if the candidate is n ancestor of the second one
         */
        public static boolean isAncestorOf(@NonNull String candidate, @NonNull String reference) {
            val candidateParts = splitReference(candidate);
            val referenceParts = splitReference(reference);
            // leave early if the candidate cannot be an ancestor
            if (candidateParts.length >= referenceParts.length) {
                return false;
            }
            return isActualStartWithExpected(referenceParts, candidateParts);
        }

        /**
         * Find the parent reference of the given reference.
         *
         * @param reference the reference
         * @return the parent reference of the given reference
         */
        public Optional<String> findParentReference(String reference) {
            val parts = splitReference(reference);
            if (parts.length == 1) {
                return Optional.empty();
            }
            return Optional.of(String.join(".", Arrays.copyOf(parts, parts.length - 1)));
        }

        /**
         * Walk down the element of the application layer.
         *
         * @param application the application
         * @param consumer    the consumer with the parent and the child
         */
        public void walkDown(Application application, BiConsumer<Element, Element> consumer) {
            for (ApplicationElement element : application.getElements()) {
                consumer.accept(null, element);
                walkDown(element, consumer);
            }
        }

        /**
         * Walk down the element of the technology layer.
         *
         * @param technology the technology
         * @param consumer   the consumer with the parent and the child
         */
        public void walkDown(Technology technology, BiConsumer<Element, Element> consumer) {
            for (TechnologyElement element : technology.getElements()) {
                consumer.accept(null, element);
                walkDown(element, consumer);
            }
        }

        /**
         * Walk down the descendents of the given element.
         *
         * @param element  the element
         * @param consumer the consumer with the parent and the child
         */
        public void walkDown(Element element, BiConsumer<Element, Element> consumer) {
            if (element instanceof Parent<?>) {
                for (Element child : ((Parent<?>) element).getElements()) {
                    consumer.accept(element, child);
                    walkDown(child, consumer);
                }
            }
        }

        /**
         * Walk down the descendents of the given element.
         *
         * @param element  the element
         * @param consumer the consumer with the child
         */
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

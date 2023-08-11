package io.morin.archicode.resource.workspace;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.deployment.Deployment;
import io.morin.archicode.resource.element.deployment.DeploymentElement;
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
    Deployment deployment = Deployment.builder().build();

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

        private static String[] splitReference(@NonNull String reference) {
            return reference.split("\\.");
        }

        /**
         * @param actualParts the actual
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

        public Optional<String> findParentReference(String reference) {
            val parts = splitReference(reference);
            if (parts.length == 1) {
                return Optional.empty();
            }
            return Optional.of(String.join(".", Arrays.copyOf(parts, parts.length - 1)));
        }

        public void walkDown(Application application, BiConsumer<Element, Element> consumer) {
            for (ApplicationElement element : application.getElements()) {
                consumer.accept(null, element);
                walkDown(element, consumer);
            }
        }

        public void walkDown(Deployment deployment, BiConsumer<Element, Element> consumer) {
            for (DeploymentElement element : deployment.getElements()) {
                consumer.accept(null, element);
                walkDown(element, consumer);
            }
        }

        public void walkDown(Element element, BiConsumer<Element, Element> consumer) {
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

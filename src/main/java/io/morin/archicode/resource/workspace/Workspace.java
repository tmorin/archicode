package io.morin.archicode.resource.workspace;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.deployment.Deployment;
import io.morin.archicode.resource.view.View;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;
import lombok.experimental.UtilityClass;
import lombok.extern.jackson.Jacksonized;
import lombok.val;

@Value
@Builder
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

    @UtilityClass
    public static class Utilities {

        public Optional<String> findParentReference(String reference) {
            val parts = reference.split("\\.");
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

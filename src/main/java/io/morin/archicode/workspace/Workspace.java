package io.morin.archicode.workspace;

import io.morin.archicode.element.Element;
import io.morin.archicode.element.application.Application;
import io.morin.archicode.element.application.ApplicationElement;
import io.morin.archicode.element.application.Parent;
import java.util.Arrays;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.experimental.Delegate;
import lombok.experimental.FieldDefaults;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Workspace {

    @Delegate
    RawWorkspace rawWorkspace;

    @Builder.Default
    public ElementIndex appIndex = ElementIndex.builder().build();

    @Builder.Default
    public ViewIndex viewIndex = ViewIndex.builder().build();

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

package io.morin.archicode.context;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.element.Element;
import io.morin.archicode.element.application.*;
import io.morin.archicode.element.application.System;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class Item {

    @NonNull
    @EqualsAndHashCode.Include
    @Builder.Default
    String itemId = String.format("item_%s", UUID.randomUUID().toString().replace("-", ""));

    @NonNull
    @ToString.Include
    String reference;

    @NonNull
    Element element;

    @NonNull
    Kind kind;

    @Builder.Default
    Set<Item> children = new HashSet<>();

    @RequiredArgsConstructor
    @Getter
    @FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
    public enum Kind {
        PERSON("Person"),
        SOLUTION("Solution"),
        SYSTEM("System"),
        CONTAINER("Container"),
        COMPONENT("Component"),
        GROUP("Group");

        String label;

        public static Kind from(@NonNull Element element) {
            if (element instanceof Component) {
                return Kind.COMPONENT;
            } else if (element instanceof Container) {
                return Kind.CONTAINER;
            } else if (element instanceof System) {
                return Kind.SYSTEM;
            } else if (element instanceof Solution) {
                return Kind.SOLUTION;
            } else if (element instanceof Person) {
                return Kind.PERSON;
            } else if (element instanceof Parent<?>) {
                return Kind.GROUP;
            }
            throw new ArchiCodeException("unable to find a matching for", element);
        }
    }
}

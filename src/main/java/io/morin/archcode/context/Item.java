package io.morin.archcode.context;

import io.morin.archcode.ArchcodeException;
import io.morin.archcode.element.Element;
import io.morin.archcode.element.application.*;
import io.morin.archcode.element.application.System;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Jacksonized
@Getter
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
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

    public enum Kind {
        PERSON,
        SOLUTION,
        SYSTEM,
        CONTAINER,
        COMPONENT,
        GROUP;

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
            throw new ArchcodeException("unable to find a matching for", element);
        }
    }
}

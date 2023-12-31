package io.morin.archicode.viewpoint;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.*;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
public class Item implements Comparable<Item> {

    @NonNull
    @ToString.Include
    String itemId;

    @NonNull
    String reference;

    @NonNull
    Element element;

    @NonNull
    Kind kind;

    @Builder.Default
    Set<Item> children = new HashSet<>();

    public Stream<Item> stream() {
        return Stream.concat(Stream.of(this), this.children.stream().flatMap(Item::stream));
    }

    @Override
    public int compareTo(Item o) {
        return this.reference.compareTo(o.reference);
    }

    @RequiredArgsConstructor
    @Getter
    @FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
    public enum Kind {
        PERSON("Person"),
        SOLUTION("Solution"),
        SYSTEM("System"),
        CONTAINER("Container"),
        COMPONENT("Component"),
        GROUP("Group"),
        ENVIRONMENT("Environment"),
        NODE("Node");

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
            } else if (element instanceof Environment) {
                return Kind.ENVIRONMENT;
            } else if (element instanceof Node) {
                return Kind.NODE;
            } else if (element instanceof Parent<?>) {
                return Kind.GROUP;
            }
            throw new ArchiCodeException("unable to find a matching for", element);
        }
    }
}

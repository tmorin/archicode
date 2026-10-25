package io.morin.archicode.viewpoint;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.*;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import java.util.HashSet;
import java.util.List;
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

    /**
     * What the element is drawn with, as the viewpoint kernel tells it: its qualifiers, then the words of its
     * {@code rendering-stereotypes} tag. The kind of the item and the way it is drawn are not in it.
     */
    @Builder.Default
    List<String> stereotypes = List.of();

    /**
     * What happened to the element between the two plateaus of a comparison (the element itself, not what is inside it);
     * {@link Change#NONE} for a view that does not compare. The kernel has already put the matching word last in
     * {@link #getStereotypes()}: {@code new}, {@code changed} or {@code removed}, or {@code contains-changes} for an
     * element that did not change and has a new, changed or removed one below it.
     */
    @Builder.Default
    Change change = Change.NONE;

    /**
     * True when the kernel computed that the element did not change and holds a change (a new, changed or removed element below
     * it). The word {@code contains-changes} in {@link #getStereotypes()} does not say it: an author may have written that word by
     * hand, as a qualifier or in the {@code rendering-stereotypes} tag, on an element that holds nothing.
     */
    @Builder.Default
    boolean containsChanges = false;

    /**
     * The references of the plateau before that this element replaces, for an element that {@link Change#MOVED},
     * {@link Change#SPLIT} or {@link Change#MERGED} (the valid ones, sorted, as the comparison lists them); empty for
     * any other.
     */
    @Builder.Default
    List<String> replaces = List.of();

    /**
     * The references that replace this element, for a replaced element that a view still draws as a place because
     * something inside it was removed; empty for any other.
     */
    @Builder.Default
    List<String> replacedBy = List.of();

    /** Why the element changed, as the comparison lists it ({@code name}, {@code relationships-added}, ...). */
    @Builder.Default
    List<String> natures = List.of();

    /**
     * True when the view shows only the changes and this item is there to give them their place (it encloses a change, or
     * is the end of a changed link, or is the focal element) and has no change of its own.
     */
    @Builder.Default
    boolean context = false;

    public Stream<Item> stream() {
        return Stream.concat(Stream.of(this), this.children.stream().flatMap(Item::stream));
    }

    /**
     * The order the views are written in: by reference, then by id. The id is needed because an application deployed
     * on several nodes is one item per node, all with the reference of the application: without it two items tie, and
     * a tie is left to the order of the {@code Set} they come from, which depends on the identity hash of the JVM.
     */
    @Override
    public int compareTo(Item o) {
        val byReference = this.reference.compareTo(o.reference);
        return byReference != 0 ? byReference : this.itemId.compareTo(o.itemId);
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
        ENVIRONMENT("Environment"),
        NODE("Node");

        String label;

        public static Kind from(@NonNull Element element) {
            if (element instanceof Component) {
                return COMPONENT;
            } else if (element instanceof Container) {
                return CONTAINER;
            } else if (element instanceof System) {
                return SYSTEM;
            } else if (element instanceof Solution) {
                return SOLUTION;
            } else if (element instanceof Person) {
                return PERSON;
            } else if (element instanceof Environment) {
                return ENVIRONMENT;
            } else if (element instanceof Node) {
                return NODE;
            }
            throw new ArchiCodeException("unable to find a matching for", element);
        }
    }
}

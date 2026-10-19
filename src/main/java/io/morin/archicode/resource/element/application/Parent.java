package io.morin.archicode.resource.element.application;

import io.morin.archicode.resource.element.Element;
import java.util.Set;

public interface Parent<C extends Element> {
    Set<C> getElements();

    /**
     * The same element with another set of children, every other property as it is (the element itself is not changed).
     *
     * @param elements the children of the copy
     * @return the copy
     */
    Parent<C> withElements(Set<C> elements);

    /**
     * The kind of element this one holds: the interface its children implement (the kinds it names with {@code @JsonSubTypes} are the
     * kinds that can be declared under it). This is the one place where the model says which kind a parent holds ({@link Nesting}).
     *
     * @return the interface of the children
     */
    Class<C> elementType();
}

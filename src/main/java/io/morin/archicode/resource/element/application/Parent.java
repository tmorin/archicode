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
}

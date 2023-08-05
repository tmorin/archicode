package io.morin.archicode.element.application;

import io.morin.archicode.element.Element;
import java.util.Set;

public interface Parent<C extends Element> {
    Set<C> getElements();
}

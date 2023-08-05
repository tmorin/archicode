package io.morin.archicode.resource.element.application;

import io.morin.archicode.resource.element.Element;
import java.util.Set;

public interface Parent<C extends Element> {
    Set<C> getElements();
}

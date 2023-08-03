package io.morin.archcode.element.application;

import io.morin.archcode.element.Element;
import java.util.Set;

public interface Parent<C extends Element> {
    Set<C> getElements();
}

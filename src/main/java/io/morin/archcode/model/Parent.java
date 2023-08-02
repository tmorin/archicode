package io.morin.archcode.model;

import java.util.Set;

public interface Parent<C extends Element> {
    Set<C> getElements();
}

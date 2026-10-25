package io.morin.archicode.rendering;

import io.morin.archicode.MapperFactory;

public interface ViewRendererService {
    String getName();

    default String getDirectory() {
        return getName();
    }

    ViewRenderer createViewRenderer();

    default void setMapperFactory(MapperFactory mapperFactory) {
        // most renderers read no document: nothing to do
    }
}

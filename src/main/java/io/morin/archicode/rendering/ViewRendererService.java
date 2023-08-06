package io.morin.archicode.rendering;

import io.morin.archicode.MapperFactory;

public interface ViewRendererService {
    String getName();

    String getExtension();

    String getDirectory();

    ViewRenderer createViewRenderer();

    default void setMapperFactory(MapperFactory mapperFactory) {}
}

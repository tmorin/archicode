package io.morin.archicode.rendering;

public interface ViewRendererService {
    String getName();

    String getExtension();

    String getDirectory();

    ViewRenderer createViewRenderer();
}

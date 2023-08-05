package io.morin.archicode.rendering;

public interface RendererFactory {
    String getName();

    String getExtension();

    String getDirectory();

    ViewRenderer createViewRenderer();
}

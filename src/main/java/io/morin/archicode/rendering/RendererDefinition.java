package io.morin.archicode.rendering;

public interface RendererDefinition {
    String getName();

    String getExtension();

    String getDirectory();

    ViewRenderer createViewRenderer();
}

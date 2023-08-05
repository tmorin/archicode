package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.RendererFactory;
import io.morin.archicode.rendering.ViewRenderer;

public class PlantumlRendererFactory implements RendererFactory {

    private static final String NAME = "plantuml";
    private static final String DIRECTORY = "plantuml";
    private static final String EXTENSION = "puml";

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public String getExtension() {
        return EXTENSION;
    }

    @Override
    public String getDirectory() {
        return DIRECTORY;
    }

    @Override
    public ViewRenderer createViewRenderer() {
        return new PlantumlViewRenderer();
    }
}

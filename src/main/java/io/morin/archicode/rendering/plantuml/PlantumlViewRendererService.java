package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.ViewRenderer;
import io.morin.archicode.rendering.ViewRendererService;

public class PlantumlViewRendererService implements ViewRendererService {

    private static final String NAME = "plantuml";

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public ViewRenderer createViewRenderer() {
        return PlantumlViewRenderer.builder().build();
    }
}

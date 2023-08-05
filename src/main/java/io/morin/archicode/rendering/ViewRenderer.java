package io.morin.archicode.rendering;

import io.morin.archicode.viewpoint.Viewpoint;
import java.io.OutputStream;

public interface ViewRenderer {
    String TAG_RENDERING_SHAPE = "rendering-shape";

    void render(Viewpoint viewpoint, OutputStream outputStream);
}

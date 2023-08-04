package io.morin.archcode.rendering;

import io.morin.archcode.context.Context;
import java.io.OutputStream;

public interface EngineRenderer {
    String TAG_RENDERING_SHAPE = "rendering-shape";
    void render(Context context, OutputStream outputStream);
}

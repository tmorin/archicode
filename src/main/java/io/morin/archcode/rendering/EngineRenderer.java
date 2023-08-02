package io.morin.archcode.rendering;

import io.morin.archcode.context.Context;
import java.io.OutputStream;

public interface EngineRenderer {
    void render(Context context, OutputStream outputStream);
}

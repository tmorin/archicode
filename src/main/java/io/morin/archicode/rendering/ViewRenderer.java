package io.morin.archicode.rendering;

import io.morin.archicode.viewpoint.Viewpoint;
import java.nio.file.Path;
import lombok.NonNull;

public interface ViewRenderer {
    String TAG_RENDERING_SHAPE = "rendering-shape";

    void render(@NonNull Viewpoint viewpoint, @NonNull Path outputPath);
}

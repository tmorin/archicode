package io.morin.archicode.rendering;

import io.morin.archicode.viewpoint.Viewpoint;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class Renderer {

    ViewRendererServiceRepository viewRendererServiceRepository;

    @SneakyThrows
    public void render(Viewpoint viewpoint, String rendererName, Path outputDirPath) {
        val viewRendererService = viewRendererServiceRepository.get(rendererName);

        val outputViewpointPath = Paths.get(
            outputDirPath.toString(),
            viewRendererService.getDirectory(),
            viewpoint.getView().getLayer().name().toLowerCase()
        );

        if (outputViewpointPath.toFile().mkdirs()) {
            log.trace("{} parent already created", outputViewpointPath);
        }

        viewRendererService.createViewRenderer().render(viewpoint, outputViewpointPath);
    }
}

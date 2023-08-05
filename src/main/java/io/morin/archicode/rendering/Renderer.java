package io.morin.archicode.rendering;

import io.morin.archicode.context.Context;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.FileOutputStream;
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

    RendererFactoryRepository rendererFactoryRepository;

    @SneakyThrows
    public void render(Context context, String rendererName, Path outputDirPath) {
        val rendererFactory = rendererFactoryRepository.getRenderFactory(rendererName);

        val outputFilePath = Paths.get(
            outputDirPath.toString(),
            rendererFactory.getDirectory(),
            String.format("%s.%s", context.getView().getViewId(), rendererFactory.getExtension())
        );

        if (outputFilePath.toFile().getParentFile().mkdirs()) {
            log.trace("outputFilePath parent already created");
        }

        val viewRenderer = rendererFactory.createViewRenderer();
        try (val oStream = new FileOutputStream(outputFilePath.toFile())) {
            viewRenderer.render(context, oStream);
        }
    }
}

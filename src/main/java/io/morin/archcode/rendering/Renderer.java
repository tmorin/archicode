package io.morin.archcode.rendering;

import io.morin.archcode.context.Context;
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

    RendererFactory rendererFactory;

    @SneakyThrows
    public void render(Context context, RendererEngine rendererEngine, Path outputDirPath) {
        val outputFilePath = Paths.get(
            outputDirPath.toString(),
            rendererEngine.getFolder(),
            String.format("%s.%s", context.getView().getViewId(), rendererEngine.getExtension())
        );

        if (outputFilePath.toFile().getParentFile().mkdirs()) {
            log.trace("outputFilePath parent already created");
        }

        try (val oStream = new FileOutputStream(outputFilePath.toFile())) {
            rendererFactory.create(rendererEngine).render(context, oStream);
        }
    }
}

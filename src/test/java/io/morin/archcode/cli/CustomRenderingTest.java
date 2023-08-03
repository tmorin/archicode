package io.morin.archcode.cli;

import io.morin.archcode.rendering.RendererEngine;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    RenderCommand renderCommand;

    @Test
    void mayRenderCustom() {
        ArchcodeCommand archcodeCommand = new ArchcodeCommand();
        archcodeCommand.workspaceFilePath = Path.of(".custom/cara.yaml");
        renderCommand.archcodeCommand = archcodeCommand;
        renderCommand.viewsDirPath = Path.of("views");
        renderCommand.rendererEngine = RendererEngine.PLANTUML;
        if (archcodeCommand.workspaceFilePath.toFile().exists()) {
            renderCommand.renderPerspectives();
        }
    }
}

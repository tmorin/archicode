package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Collections;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    RenderCommand renderCommand;

    @Test
    void mayRenderCustom() {
        ArchiCodeCommand archiCodeCommand = new ArchiCodeCommand();
        archiCodeCommand.workspaceFilePath = Path.of(".custom/cara.yaml");
        renderCommand.archiCodeCommand = archiCodeCommand;
        renderCommand.viewsDirPath = Path.of("views");
        renderCommand.rendererName = "plantuml";
        if (archiCodeCommand.workspaceFilePath.toFile().exists()) {
            renderCommand.renderViews(Collections.emptySet());
        }
    }
}

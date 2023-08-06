package io.morin.archicode.cli;

import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Collections;
import lombok.val;

public abstract class AbstractRenderTest {

    @Inject
    RenderCommand renderCommand;

    void renderWithPlantuml(Path workspacePath) {
        val archiCodeCommand = new ArchiCodeCommand();
        archiCodeCommand.workspaceFilePath = workspacePath;
        renderCommand.archiCodeCommand = archiCodeCommand;
        renderCommand.viewsDirPath = Path.of(workspacePath.getFileName().toString().replace(".", "_"));
        renderCommand.rendererName = "plantuml";
        renderCommand.renderViews(Collections.emptySet());
    }
}

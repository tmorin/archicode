package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Set;
import lombok.val;

public abstract class AbstractGenerateViews {

    @Inject
    GenerateViews generateViews;

    void renderWithPlantuml(Path workspacePath, String... viewIds) {
        val archiCodeCommand = new ArchiCode();
        archiCodeCommand.workspaceFilePath = workspacePath;
        generateViews.archiCode = archiCodeCommand;
        generateViews.viewsDirPath = Path.of(workspacePath.getFileName().toString().replace(".", "_"));
        generateViews.rendererName = "plantuml";
        generateViews.viewPropertiesFormat = MapperFormat.JSON;
        generateViews.viewIds = Set.of(viewIds);
        generateViews.run();
    }
}

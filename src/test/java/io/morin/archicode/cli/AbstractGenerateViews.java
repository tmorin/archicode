package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Assertions;

public abstract class AbstractGenerateViews {

    @Inject
    protected GenerateViewsCommand generateViewsCommand;

    protected void renderWithPlantuml(Path workspacePath, String... viewIds) {
        val archiCodeCommand = new ArchiCode();
        archiCodeCommand.workspaceFilePath = workspacePath;

        val views = new ViewsGroup();
        views.archiCode = archiCodeCommand;

        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.viewsDirPath = Path.of(workspacePath.getFileName().toString().replace(".", "_"));
        generateViewsCommand.rendererName = "plantuml";
        generateViewsCommand.viewPropertiesFormat = MapperFormat.JSON;
        generateViewsCommand.viewIds = Set.of(viewIds);
        Assertions.assertDoesNotThrow(generateViewsCommand::run);
    }

    protected void renderWithDefault(Path workspacePath, Set<String> viewpointNames, Set<String> viewIds) {
        val archiCodeCommand = new ArchiCode();
        archiCodeCommand.workspaceFilePath = workspacePath;

        val views = new ViewsGroup();
        views.archiCode = archiCodeCommand;

        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.viewpointNames = viewpointNames;
        generateViewsCommand.viewIds = viewIds;
        generateViewsCommand.rendererName = "plantuml";
        generateViewsCommand.viewPropertiesFormat = MapperFormat.JSON;
        generateViewsCommand.run();
        Assertions.assertDoesNotThrow(generateViewsCommand::run);
    }
}

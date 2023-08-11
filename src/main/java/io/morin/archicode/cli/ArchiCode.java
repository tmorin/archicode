package io.morin.archicode.cli;

import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.picocli.runtime.annotations.TopCommand;
import jakarta.inject.Inject;
import java.nio.file.Path;
import picocli.CommandLine;

@TopCommand
@CommandLine.Command(
    description = "ArchiCode provides features to support architecture work with an as-code approach.",
    subcommands = { ViewsCommand.class }
)
public class ArchiCode {

    @CommandLine.ParentCommand
    ArchiCode archiCode;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @CommandLine.Option(
        names = { "-w", "--resources" },
        description = "The resources file.",
        defaultValue = "resources.yaml",
        paramLabel = "<resources file>"
    )
    Path workspaceFilePath;
}

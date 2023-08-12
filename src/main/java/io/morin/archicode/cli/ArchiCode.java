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
    subcommands = { ViewsGroup.class, QueryGroup.class }
)
public class ArchiCode {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @CommandLine.Option(
        names = { "-w", "--workspace" },
        description = "The workspace file.",
        defaultValue = "workspace.yaml",
        paramLabel = "<workspace file>",
        scope = CommandLine.ScopeType.INHERIT
    )
    Path workspaceFilePath;

    @CommandLine.Option(
        names = { "-h", "--help" },
        usageHelp = true,
        description = "Display this help message.",
        scope = CommandLine.ScopeType.INHERIT
    )
    boolean usageHelpRequested;
}

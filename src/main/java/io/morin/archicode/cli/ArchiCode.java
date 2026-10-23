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
    versionProvider = VersionProvider.class,
    subcommands = {
        ViewsGroup.class,
        QueryGroup.class,
        EditorGroup.class,
        PlateauGroup.class,
        StoriesGroup.class,
        DiffCommand.class
    }
)
@SuppressWarnings("java:S6813")
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
        defaultValue = ".archicode.yaml",
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

    /** {@code -V} and {@code --version} are the top command's alone: the usage of every other command is as it was. */
    @CommandLine.Option(
        names = { "-V", "--version" },
        versionHelp = true,
        description = "Print the version of ArchiCode and exit."
    )
    boolean versionRequested;
}

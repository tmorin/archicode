package io.morin.archicode.cli;

import io.quarkus.picocli.runtime.annotations.TopCommand;
import java.nio.file.Path;
import picocli.CommandLine;

@TopCommand
@CommandLine.Command(
    description = "ArchiCode provides features to support architecture work with an as-code approach.",
    subcommands = { RenderCommand.class }
)
public class ArchiCodeCommand {

    @CommandLine.Option(
        names = { "-w", "--workspace" },
        description = "The workspace file.",
        defaultValue = "workspace.yaml",
        paramLabel = "<workspace file>"
    )
    Path workspaceFilePath;
}

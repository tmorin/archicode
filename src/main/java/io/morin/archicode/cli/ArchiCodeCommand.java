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
        names = { "-w", "--resources" },
        description = "The resources file.",
        defaultValue = "resources.yaml",
        paramLabel = "<resources file>"
    )
    Path workspaceFilePath;
}

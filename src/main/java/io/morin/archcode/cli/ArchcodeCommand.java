package io.morin.archcode.cli;

import io.quarkus.picocli.runtime.annotations.TopCommand;
import java.nio.file.Path;
import picocli.CommandLine;

@TopCommand
@CommandLine.Command(
    description = "Archcode provides features to support architecture work with an as-code approach.",
    subcommands = { RenderCommand.class }
)
public class ArchcodeCommand {

    @CommandLine.Option(
        names = { "-w", "--workspace" },
        description = "The workspace file.",
        defaultValue = "workspace.yaml",
        paramLabel = "<workspace file>"
    )
    Path workspaceFilePath;
}

package io.morin.archicode.cli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "import",
    description = "Import a model written for another tool into an ArchiCode workspace.",
    subcommands = { ImportStructurizrCommand.class, ImportLikeC4Command.class }
)
public class ImportGroup {

    @CommandLine.ParentCommand
    ArchiCode archiCode;
}

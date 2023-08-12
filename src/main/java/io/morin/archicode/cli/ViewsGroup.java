package io.morin.archicode.cli;

import lombok.extern.slf4j.Slf4j;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(
    name = "views",
    description = "Manage the views of the workspace.",
    subcommands = { GenerateViewsCommand.class, ListViewsCommand.class }
)
public class ViewsGroup {

    @CommandLine.ParentCommand
    ArchiCode archiCode;
}

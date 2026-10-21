package io.morin.archicode.cli;

import lombok.extern.slf4j.Slf4j;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(
    name = "stories",
    description = "Manage the stories of the workspace.",
    subcommands = { GenerateStoriesCommand.class }
)
public class StoriesGroup {

    @CommandLine.ParentCommand
    ArchiCode archiCode;
}

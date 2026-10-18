package io.morin.archicode.cli;

import lombok.extern.slf4j.Slf4j;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(
    name = "plateau",
    description = "Manage the plateaus of the workspace.",
    subcommands = { AddPlateauCommand.class, ListPlateausCommand.class }
)
public class PlateauGroup {

    @CommandLine.ParentCommand
    ArchiCode archiCode;
}

package io.morin.archicode.cli;

import io.morin.archicode.workspace.PlateauAdder;
import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * Copy the folder of a plateau into a new folder and add the plateau to {@code settings.plateaus}.
 */
@Slf4j
@CommandLine.Command(
    name = "add",
    description = {
        "Add a plateau to the workspace: copy the folder of an existing plateau into a new folder and append the new plateau to settings.plateaus of workspace.yaml (its comments and layout are kept).",
        "The new folder is next to the copied one. When the copied folder carries a number (plateaus/10_as-is), the new one gets the next multiple of ten above the highest number of its siblings (plateaus/40_to-be); the number only helps to sort the folders, the order of the list is the one that counts."
    }
)
public class AddPlateauCommand implements Runnable {

    @CommandLine.ParentCommand
    PlateauGroup plateauGroup;

    @Inject
    PlateauAdder plateauAdder;

    @CommandLine.Parameters(index = "0", paramLabel = "ID", description = "The id of the new plateau.")
    String id;

    @CommandLine.Option(
        names = { "--from" },
        required = true,
        paramLabel = "PLATEAU_ID",
        description = "The id of the plateau whose folder is copied."
    )
    String from;

    @CommandLine.Option(names = { "--name" }, paramLabel = "NAME", description = "The name of the new plateau.")
    String name;

    @CommandLine.Option(
        names = { "--horizon" },
        paramLabel = "HORIZON",
        description = "When the new plateau is meant to hold, as free text such as 2027-Q1. It is never interpreted."
    )
    String horizon;

    @CommandLine.Option(
        names = { "--path" },
        paramLabel = "PATH",
        description = "The folder of the new plateau, relative to the folder of the workspace file and below it. Default: next to the copied folder, named after the id."
    )
    String path;

    @CommandLine.Option(
        names = { "--baseline" },
        paramLabel = "PLATEAU_ID",
        description = "The plateau the new one is compared with, written as its baseline. Default: none written, the new plateau is compared with the one before it in the list."
    )
    String baseline;

    @Override
    public void run() {
        val added = plateauAdder.add(
            plateauGroup.archiCode.workspaceFilePath.toAbsolutePath(),
            id,
            from,
            name,
            horizon,
            path,
            baseline
        );
        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.printf(
            "plateau `%s` added: `%s` copied to `%s`, and the plateau appended to settings.plateaus%n",
            added.id(),
            added.from(),
            added.path()
        );
    }
}

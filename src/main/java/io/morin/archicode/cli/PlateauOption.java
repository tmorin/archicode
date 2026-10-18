package io.morin.archicode.cli;

import picocli.CommandLine;

/**
 * The option of the commands that load a workspace to choose its plateau. Without it, the plateau is the one named by
 * {@code settings.current}, else the last one when the plateaus form one line (a tree that forks needs a choice).
 */
public class PlateauOption {

    @CommandLine.Option(
        names = { "--plateau" },
        paramLabel = "PLATEAU_ID",
        description = "The plateau to read, by its id (a plateau: key of a header or a Plateau manifest). Default: settings.current, else the last plateau when they form one line."
    )
    String plateauId;
}

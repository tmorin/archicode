package io.morin.archicode.cli;

import picocli.CommandLine;

/**
 * The option of the commands that load a workspace to choose its plateau. Without it, the plateau is the one named by
 * {@code settings.current}, else the last one of {@code settings.plateaus}, or, for layered plateaus, the last one when they
 * form one line (a tree that forks needs a choice).
 */
public class PlateauOption {

    @CommandLine.Option(
        names = { "--plateau" },
        paramLabel = "PLATEAU_ID",
        description = "The plateau to read, by its id (a plateau: key of a header or a Plateau manifest, or settings.plateaus). Default: settings.current, else the last plateau (layered plateaus: when they form one line)."
    )
    String plateauId;
}

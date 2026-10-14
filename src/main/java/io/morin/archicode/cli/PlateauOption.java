package io.morin.archicode.cli;

import picocli.CommandLine;

/**
 * The option of the commands that load a workspace to choose its plateau. Without it, the plateau is the one named by
 * {@code settings.current}, else the last one of {@code settings.plateaus}.
 */
public class PlateauOption {

    @CommandLine.Option(
        names = { "--plateau" },
        paramLabel = "PLATEAU_ID",
        description = "The plateau to read, by its id in settings.plateaus. Default: settings.current, else the last plateau."
    )
    String plateauId;
}

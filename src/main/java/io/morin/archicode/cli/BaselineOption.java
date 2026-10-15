package io.morin.archicode.cli;

import picocli.CommandLine;

/**
 * The option of the commands that compare a plateau with another one, to choose the other one. Without it the baseline is
 * the {@code baseline} the plateau names in {@code settings.plateaus}, else the plateau before it in the list.
 */
public class BaselineOption {

    @CommandLine.Option(
        names = { "--baseline" },
        paramLabel = "PLATEAU_ID",
        description = "The plateau to compare the plateau with, by its id in settings.plateaus. Default: the baseline key of the plateau, else the plateau before it in the list."
    )
    String baselineId;
}

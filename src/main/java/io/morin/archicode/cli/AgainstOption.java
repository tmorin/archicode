package io.morin.archicode.cli;

import picocli.CommandLine;

/**
 * The option of the commands that compare a plateau with another one, to choose the other one. Without it the plateau is
 * compared with the one it overrides; {@code baseline} is the root of the plateaus, and nothing else.
 */
public class AgainstOption {

    @CommandLine.Option(
        names = { "--against" },
        paramLabel = "PLATEAU_ID",
        description = "The plateau to compare the plateau with, any plateau of the workspace (siblings too). Default: the plateau it overrides. 'baseline' is the root of the plateaus."
    )
    String againstId;
}

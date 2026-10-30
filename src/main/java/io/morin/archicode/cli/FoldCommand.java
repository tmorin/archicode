package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.FoldReport;
import io.morin.archicode.workspace.PlateauFoldService;
import jakarta.inject.Inject;
import lombok.val;
import picocli.CommandLine;

/**
 * {@code archicode plateau fold <id> --dry-run}: says what folding a plateau into the plateau above it would do (wave 028,
 * run 0207, issue #65). It reads the workspace and writes nothing; without {@code --dry-run} it refuses, so that a script
 * written now does not start to write when a later run makes the option optional.
 */
@CommandLine.Command(
    name = "fold",
    description = {
        "Say what folding a plateau into the plateau above it would do: the files rewritten or deleted, the patches, the replaces to compose and what stays.",
        "Only the dry run exists: --dry-run is required and nothing is written. A plateau that cannot be folded is one error line."
    }
)
public class FoldCommand implements Runnable {

    @CommandLine.ParentCommand
    PlateauGroup plateauGroup;

    @Inject
    PlateauFoldService service;

    @CommandLine.Parameters(index = "0", paramLabel = "<plateau>", description = "The plateau to fold.")
    String plateau;

    @CommandLine.Option(names = "--dry-run", description = "Read the plan and write nothing (required for now).")
    boolean dryRun;

    @Override
    public void run() {
        if (!dryRun) {
            throw new ArchiCodeException("plateau fold does not write yet: add `--dry-run` to read the plan");
        }
        val plan = service.plan(plateauGroup.archiCode.workspaceFilePath.toAbsolutePath(), plateau);
        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.println(FoldReport.render(plan));
    }
}

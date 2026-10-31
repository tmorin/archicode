package io.morin.archicode.cli;

import io.morin.archicode.workspace.FoldFiles;
import io.morin.archicode.workspace.FoldReport;
import io.morin.archicode.workspace.PlateauFoldService;
import jakarta.inject.Inject;
import lombok.val;
import picocli.CommandLine;

/**
 * {@code archicode plateau fold <id> [--dry-run]}: folds a plateau into the plateau above it, or says what the fold would do
 * (wave 028, runs 0207 and 0208, issue #65). The plain form rewrites the manifests, deletes the folded plateau's manifest and
 * prints what it did; with {@code --dry-run} it does everything but the write. All of it is {@link PlateauFoldService}'s.
 */
@CommandLine.Command(
    name = "fold",
    description = {
        "Fold a plateau into the plateau above it: the files are rewritten or deleted, the patches merged and the replaces composed, then the plateaus that remain are read before and after on a temporary copy and the folder is written only if they read the same.",
        "--dry-run says what the fold would do and writes nothing. A plateau that cannot be folded is one error line and the folder is not changed."
    }
)
public class FoldCommand implements Runnable {

    @CommandLine.ParentCommand
    PlateauGroup plateauGroup;

    @Inject
    PlateauFoldService service;

    @CommandLine.Parameters(index = "0", paramLabel = "<plateau>", description = "The plateau to fold.")
    String plateau;

    @CommandLine.Option(names = "--dry-run", description = "Say what the fold would do and write nothing.")
    boolean dryRun;

    @Override
    public void run() {
        val folded = service.fold(
            plateauGroup.archiCode.workspaceFilePath.toAbsolutePath(),
            plateau,
            !dryRun,
            FoldFiles.disk()
        );
        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.println(FoldReport.render(folded));
    }
}

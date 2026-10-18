package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.gap.GapReport;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.morin.archicode.workspace.Removal;
import io.morin.archicode.workspace.StateTags;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * What a plateau changes: the new, changed and removed elements and relationships, as a table to read.
 */
@Slf4j
@CommandLine.Command(
    name = "diff",
    description = {
        "Compare a plateau with another one: the elements and the relationships that are new, changed or removed, and what changed in each, as a table.",
        "The plateau is the one --plateau names (default: settings.current, else the last one when the plateaus form one line); it is compared with the --against plateau, any plateau of the workspace, siblings included (default: the plateau it overrides). A difference is not an error: the exit code is 0, unless --fail-on asks otherwise.",
        "--fail-on makes the command a check for a build: it exits with code 3 (1 is an error, 2 a usage error) when the comparison holds a change of one of the states listed, and the table is printed as it is without it.",
        "The cascade of the REMOVE patches the plateau adds is listed after the table."
    }
)
public class DiffCommand implements Runnable, CommandLine.IExitCodeGenerator {

    @CommandLine.ParentCommand
    ArchiCode archiCode;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    Warnings warnings;

    @CommandLine.Mixin
    PlateauOption plateauOption = new PlateauOption();

    @CommandLine.Mixin
    AgainstOption againstOption = new AgainstOption();

    @CommandLine.Option(
        names = { "-f", "--format" },
        paramLabel = "FORMAT",
        defaultValue = "text",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The format of the table: text, markdown or json.",
        converter = GapFormatConverter.class
    )
    GapFormat format = GapFormat.TEXT;

    @CommandLine.Option(
        names = { "--no-wording" },
        description = "Leave out of the table the elements whose description is the only thing that changed, and say how many are left out."
    )
    boolean noWording;

    @CommandLine.Option(
        names = { "--fail-on" },
        paramLabel = "STATE[,STATE...]",
        description = "Exit with code 3 when the comparison holds a change of one of these states, a list separated by commas (the option may be repeated): new, changed, removed, moved, split, merged, contains-changes, or any (any of the first six). Without it the exit code is 0 whatever the comparison holds. With --no-wording, a description that is the only thing that changed does not count."
    )
    List<String> failOn;

    private int exitCode;

    @Override
    public int getExitCode() {
        return exitCode;
    }

    @Override
    public void run() {
        exitCode = 0;
        // the words are checked before anything is loaded: a typo is told at once, and not after the load of two plateaus
        val failOnStates = FailOn.parse(failOn);
        val path = archiCode.workspaceFilePath.toAbsolutePath();

        val target = workspaceFactory.create(path, null, plateauOption.plateauId);
        if (target.getPlateau() == null) {
            throw new ArchiCodeException(
                "the workspace declares no plateau: there is nothing to compare. A plateau is a layer: write `plateau: <id>` in the header of its manifests and declare it in a manifest of kind `archicode.morin.io/plateau`"
            );
        }
        val againstId = Against.of(target, againstOption.againstId);
        if (againstId == null) {
            throw new ArchiCodeException(
                "the plateau `%s` is the root of the plateaus and nothing is before it: there is nothing to compare it with. Name a plateau with `--against`",
                target.getPlateau().getId()
            );
        }
        val base = workspaceFactory.create(path, null, againstId);
        // what the REMOVE patches of the layers took besides what they name, among what the other plateau has
        val cascade = Removal.cascade(target.getRemovals(), base);

        val comparison = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, target);

        // what the comparison ignored in the `replaces` of the plateau, then a state written by hand that the comparison does
        // not give the element: on the error output (see Warnings), so that the table on the standard output is what it was
        warnings.warnAll(comparison.getWarnings());
        warnings.warnAll(StateTags.warnings(target, comparison));

        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.print(GapReport.render(comparison, format, noWording, cascade));

        if (FailOn.holds(comparison, failOnStates, noWording)) {
            exitCode = ErrorOutput.CHANGES_FOUND;
        }
    }
}

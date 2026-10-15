package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.gap.GapReport;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.morin.archicode.workspace.Plateaus;
import io.morin.archicode.workspace.StateTags;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
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
        "The plateau is the one --plateau names (default: settings.current, else the last one); it is compared with the --baseline plateau (default: the baseline key of the plateau, else the plateau before it in the list). A difference is not an error: the exit code is 0."
    }
)
public class DiffCommand implements Runnable {

    @CommandLine.ParentCommand
    ArchiCode archiCode;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @CommandLine.Spec
    CommandLine.Model.CommandSpec spec;

    @CommandLine.Mixin
    PlateauOption plateauOption = new PlateauOption();

    @CommandLine.Mixin
    BaselineOption baselineOption = new BaselineOption();

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

    @Override
    public void run() {
        val path = archiCode.workspaceFilePath.toAbsolutePath();

        val target = workspaceFactory.create(path, null, plateauOption.plateauId);
        if (target.getPlateau() == null) {
            throw new ArchiCodeException(
                "the workspace declares no `settings.plateaus`: there is nothing to compare. List the states of the architecture in `settings.plateaus`, each a folder of manifests (`archicode plateau add` copies a plateau into a new one)"
            );
        }
        val baseline = Plateaus.baseline(target.getSettings(), target.getPlateau(), baselineOption.baselineId);
        if (baseline == null) {
            throw new ArchiCodeException(
                "the plateau `%s` is the first plateau and nothing is before it: there is nothing to compare it with. Name a plateau with `--baseline`, or with a `baseline` key of the plateau in `settings.plateaus`",
                target.getPlateau().getId()
            );
        }
        val base = workspaceFactory.create(path, null, baseline.getId());

        val comparison = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, target);

        // what the comparison ignored in the `replaces` of the plateau, then a state written by hand that the comparison does
        // not give the element: on the error output, so that the table on the standard output is what it was
        StateTagReport.print(spec, StateTagReport.replaces(comparison.getWarnings()));
        StateTagReport.print(spec, StateTags.warnings(target, comparison));

        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.print(GapReport.render(comparison, format, noWording));
    }
}

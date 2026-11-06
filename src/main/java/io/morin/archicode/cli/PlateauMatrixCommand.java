package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.matrix.MatrixReport;
import io.morin.archicode.rendering.matrix.PlateauMatrix;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.StateTags;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.SneakyThrows;
import lombok.val;
import picocli.CommandLine;

/**
 * What a path of plateaus changes, element by element: a row per lineage (followed through {@code replaces}), a column per
 * plateau and, from three plateaus, a Span column that is one comparison of the first plateau with the last.
 */
@CommandLine.Command(
    name = "matrix",
    description = {
        "Write the matrix of a path of plateaus: a row per element lineage (followed through `replaces`), a column per plateau, and from three plateaus a SPAN column that is one comparison of the first plateau with the last. A row without a change is left out and counted.",
        "The path is the plateau ids, oldest first, each one a plateau that overrides the one before it (a plateau may be skipped), or the chain from `baseline` to --plateau (default: settings.current, else the last plateau when the plateaus form one line). Two plateaus that are alternatives (siblings) are not a path: that is one error.",
        "The table is printed in --format. With --output the command writes matrix.md and matrix.json in the folder PATH-matrix-<first>-to-<last> (default PATH: the views folder of the settings) and prints its name; put the plateau ids before --output."
    }
)
public class PlateauMatrixCommand implements Runnable {

    @CommandLine.ParentCommand
    PlateauGroup plateauGroup;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    Warnings warnings;

    @CommandLine.Parameters(
        paramLabel = "PLATEAU_ID",
        arity = "0..*",
        description = "The plateaus of the path, oldest first. Without them, the path is the chain from baseline to --plateau."
    )
    List<String> plateauIds = new ArrayList<>();

    @CommandLine.Mixin
    PlateauOption plateauOption = new PlateauOption();

    @CommandLine.Option(
        names = { "-f", "--format" },
        paramLabel = "FORMAT",
        description = "The format of the table: text, markdown or json (default: text). Not with --output.",
        converter = GapFormatConverter.class
    )
    GapFormat format;

    @CommandLine.Option(
        names = { "-o", "--output" },
        paramLabel = "PATH",
        arity = "0..1",
        fallbackValue = "",
        description = "Write matrix.md and matrix.json in PATH-matrix-<first>-to-<last>, instead of printing the table: PATH is relative to the folder of the workspace file, or absolute (default: the views folder of the settings)."
    )
    String output;

    @Override
    @SneakyThrows
    public void run() {
        if (format != null && output != null) {
            throw new ArchiCodeException(
                "`--format` and `--output` do not go together: the files are matrix.md and matrix.json, and the table is printed in the format otherwise"
            );
        }
        val workspacePath = plateauGroup.archiCode.workspaceFilePath.toAbsolutePath();

        // the path is told from the tree alone: nothing is loaded or compared before it is a path of one chain
        val facts = workspaceFactory.facts(workspacePath);
        val ids = MatrixPath.of(facts.parsed().plateaus(), plateauIds, plateauOption.plateauId, facts.current());

        val viewsDirPath = output == null || output.isEmpty() ? null : Path.of(output);
        val workspaces = new ArrayList<Workspace>();
        for (val id : ids) {
            workspaces.add(workspaceFactory.create(workspacePath, viewsDirPath, id));
        }

        val comparer = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON));
        val steps = new ArrayList<Comparison>();
        for (var i = 1; i < workspaces.size(); i++) {
            val step = comparer.compare(workspaces.get(i - 1), workspaces.get(i));
            warnings.warnAll(step.getWarnings());
            warnings.warnAll(StateTags.warnings(workspaces.get(i), step));
            steps.add(step);
        }
        Comparison span = null;
        if (workspaces.size() > 2) {
            span = comparer.compare(workspaces.getFirst(), workspaces.getLast());
            warnings.warnAll(span.getWarnings());
        }

        val matrix = PlateauMatrix.of(
            workspaces.stream().map(Workspace::getPlateau).toList(),
            workspaces.stream().map(PlateauMatrixCommand::presence).toList(),
            steps,
            span
        );

        if (output == null) {
            // printed to System.out: application.properties sets quarkus.log.level=ERROR
            System.out.print(MatrixReport.render(matrix, format == null ? GapFormat.TEXT : format));
            return;
        }
        // the whole text is built before the first file is written
        val markdown = MatrixReport.render(matrix, GapFormat.MARKDOWN);
        val json = MatrixReport.render(matrix, GapFormat.JSON);
        val folder = outputFolder(workspacePath, workspaces, ids);
        write(folder, markdown, json);
        System.out.println("wrote " + folder);
    }

    /** {@code PATH-matrix-<first>-to-<last>}, below the folder of the workspace file when PATH is relative. */
    private Path outputFolder(Path workspacePath, List<Workspace> workspaces, List<String> ids) {
        final String base;
        if (output.isEmpty()) {
            // a layered plateau reads its views folder as views-<plateau>: the path of the settings is what is before that
            val last = ids.getLast();
            val loaded = workspaces.getLast().getSettings().getViews().getPath();
            base = loaded.endsWith("-" + last) ? loaded.substring(0, loaded.length() - last.length() - 1) : loaded;
        } else {
            base = output;
        }
        val name = base + "-matrix-" + ids.getFirst() + "-to-" + ids.getLast();
        return workspacePath.getParent().resolve(name).normalize();
    }

    private static void write(Path folder, String markdown, String json) throws IOException {
        Files.createDirectories(folder);
        Files.writeString(folder.resolve("matrix.md"), markdown, StandardCharsets.UTF_8);
        Files.writeString(folder.resolve("matrix.json"), json, StandardCharsets.UTF_8);
    }

    /** What a loaded plateau holds, by layer: the presence of a reference is read from the plateau, not from a union. */
    private static List<PlateauMatrix.Node> presence(Workspace workspace) {
        val nodes = new ArrayList<PlateauMatrix.Node>();
        nodes.addAll(layer("application", workspace.appIndex));
        nodes.addAll(layer("technology", workspace.techIndex));
        return nodes;
    }

    private static List<PlateauMatrix.Node> layer(String layer, ElementIndex index) {
        val nodes = new ArrayList<PlateauMatrix.Node>();
        index.elementByReferenceIndex.forEach((reference, element) ->
            nodes.add(
                new PlateauMatrix.Node(
                    layer,
                    reference,
                    Item.Kind.from(element).name().toLowerCase(Locale.ROOT),
                    element.getName()
                )
            )
        );
        return nodes;
    }
}

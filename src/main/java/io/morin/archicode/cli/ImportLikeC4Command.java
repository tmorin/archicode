package io.morin.archicode.cli;

import io.morin.archicode.importer.ImportFiles;
import io.morin.archicode.importer.LikeC4ImportService;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import lombok.val;
import picocli.CommandLine;

/**
 * {@code archicode import likec4 <model.json> --output <folder>}: writes an ArchiCode workspace from the JSON export of a
 * LikeC4 model. It loads no workspace ({@code -w} is not read). All of it is {@link LikeC4ImportService}'s.
 */
@CommandLine.Command(
    name = "likec4",
    description = {
        "Import the JSON export of a LikeC4 model (elements, their kinds and their relationships) into a new ArchiCode workspace.",
        "The actor, system, container and component kinds are mapped by default; each other kind needs --map <kind>=<person|system|container|component>. Views, deployment, styles and metadata are not imported: each is said as a warning. The folder must be absent or empty; a LikeC4 source file, a file that is not a JSON export, or a folder that is not empty, is one error line and nothing is written."
    }
)
public class ImportLikeC4Command implements Runnable {

    @CommandLine.ParentCommand
    ImportGroup importGroup;

    @Inject
    LikeC4ImportService service;

    @CommandLine.Parameters(index = "0", paramLabel = "<model.json>", description = "The JSON export to read.")
    Path input;

    @CommandLine.Option(
        names = { "-o", "--output" },
        required = true,
        paramLabel = "<folder>",
        description = "The folder to write the workspace in: absent or empty."
    )
    Path output;

    @CommandLine.Option(
        names = "--map",
        paramLabel = "<kind>=<kind>",
        description = "Map a LikeC4 kind to person, system, container or component. Repeatable."
    )
    List<String> maps;

    @CommandLine.Option(
        names = "--project",
        paramLabel = "<id>",
        description = "The project to read when the file holds several."
    )
    String project;

    @Override
    public void run() {
        val imported = service.importModel(input, output, maps, project, ImportFiles.disk());
        // printed to System.out: application.properties sets quarkus.log.level=ERROR
        System.out.println(
            "imported %d elements and %d relationships into %s".formatted(
                imported.elements(),
                imported.relationships(),
                output
            )
        );
    }
}

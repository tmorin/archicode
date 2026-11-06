package io.morin.archicode.cli;

import io.morin.archicode.importer.ImportFiles;
import io.morin.archicode.importer.StructurizrImportService;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.val;
import picocli.CommandLine;

/**
 * {@code archicode import structurizr <workspace.json> --output <folder>}: writes an ArchiCode workspace from the JSON export
 * of a Structurizr workspace. It loads no workspace ({@code -w} is not read). All of it is {@link StructurizrImportService}'s.
 */
@CommandLine.Command(
    name = "structurizr",
    description = {
        "Import the JSON export of a Structurizr workspace (people, software systems, containers, components and their relationships) into a new ArchiCode workspace.",
        "Views, deployment, styles, documentation and properties are not imported: each is said as a warning. The folder must be absent or empty; a file that is not a JSON export, or a folder that is not empty, is one error line and nothing is written."
    }
)
public class ImportStructurizrCommand implements Runnable {

    @CommandLine.ParentCommand
    ImportGroup importGroup;

    @Inject
    StructurizrImportService service;

    @CommandLine.Parameters(index = "0", paramLabel = "<workspace.json>", description = "The JSON export to read.")
    Path input;

    @CommandLine.Option(
        names = { "-o", "--output" },
        required = true,
        paramLabel = "<folder>",
        description = "The folder to write the workspace in: absent or empty."
    )
    Path output;

    @Override
    public void run() {
        val imported = service.importWorkspace(input, output, ImportFiles.disk());
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

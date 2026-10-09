package io.morin.archicode.cli;

import lombok.extern.slf4j.Slf4j;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(
    name = "editor",
    description = "Manage the local manifest editor server.",
    subcommands = { ServeEditorCommand.class }
)
public class EditorGroup {

    @CommandLine.ParentCommand
    ArchiCode archiCode;
}

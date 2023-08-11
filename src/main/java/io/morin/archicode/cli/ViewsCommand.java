package io.morin.archicode.cli;

import lombok.extern.slf4j.Slf4j;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(
    name = "views",
    description = "Manage views",
    subcommands = { GenerateViews.class, ListViews.class }
)
public class ViewsCommand {}

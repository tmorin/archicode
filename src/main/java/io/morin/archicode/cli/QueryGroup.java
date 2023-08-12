package io.morin.archicode.cli;

import lombok.extern.slf4j.Slf4j;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(
    name = "query",
    description = "Query the ArchiCode data model.",
    subcommands = { GetSchemasQuery.class }
)
public class QueryGroup {}

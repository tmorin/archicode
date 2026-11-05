package io.morin.archicode.cli;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.workspace.Impact;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import lombok.SneakyThrows;
import lombok.val;
import picocli.CommandLine;

/**
 * {@code archicode query impact <reference>}: what a change to an element touches, as one line of JSON. The command is
 * thin: it checks the depth, loads the workspace, takes the references and the couplings (the relationships, then the
 * deployments) from the graph of {@link GetGraphQuery#buildGraph}, and prints what {@link Impact#walk} answers.
 * <p>
 * Picocli reads an enum by the exact name of its constant, and the options are written in lowercase, so
 * {@code --direction} and {@code --through} have a converter in the pattern of {@link OutputFormatConverter}.
 */
@CommandLine.Command(
    name = "impact",
    description = {
        "Print what a change to an element touches, as one line of JSON: the elements reached, their distance in hops and the first coupling that reached them.",
        "An element covers its descendants: a reached element is named once, at its shortest distance, and the start and its descendants are left out. A reference that is no element, or a depth below 1, is one error line."
    }
)
public class ImpactQuery implements Runnable {

    /** The couplings that {@code --through} can name. */
    public enum Through {
        RELATIONSHIPS,
        DEPLOYMENTS
    }

    /** Reads {@code in}, {@code out} or {@code both}. */
    public static class DirectionConverter implements CommandLine.ITypeConverter<Impact.Direction> {

        @Override
        public Impact.Direction convert(String value) {
            return Impact.Direction.valueOf(value.toUpperCase(Locale.ROOT));
        }
    }

    /** Reads {@code relationships} or {@code deployments}. */
    public static class ThroughConverter implements CommandLine.ITypeConverter<Through> {

        @Override
        public Through convert(String value) {
            return Through.valueOf(value.toUpperCase(Locale.ROOT));
        }
    }

    @CommandLine.ParentCommand
    QueryGroup queryGroup;

    @CommandLine.Mixin
    PlateauOption plateauOption = new PlateauOption();

    @Inject
    QueryOutputWriter queryOutputWriter;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    WorkspaceFactory workspaceFactory;

    @CommandLine.Parameters(
        index = "0",
        paramLabel = "<reference>",
        description = "The reference of the element a change is made to, as `archicode query graph` lists them."
    )
    String reference;

    @CommandLine.Option(
        names = "--direction",
        paramLabel = "<in|out|both>",
        converter = DirectionConverter.class,
        description = "Which way the couplings are followed: in (the elements that point at it), out (the elements it points at) or both. Default: ${DEFAULT-VALUE}."
    )
    Impact.Direction direction = Impact.Direction.IN;

    @CommandLine.Option(
        names = "--depth",
        paramLabel = "<n>",
        description = "The number of hops at most, 1 or more. Default: no bound."
    )
    Integer depth;

    @CommandLine.Option(
        names = "--qualifier",
        paramLabel = "<qualifier>",
        description = "Follow only the relationships that carry this qualifier; repeatable, any of them. It filters relationships only."
    )
    List<String> qualifiers = new ArrayList<>();

    @CommandLine.Option(
        names = "--through",
        paramLabel = "<relationships|deployments>",
        converter = ThroughConverter.class,
        description = "The couplings followed, repeatable: relationships or deployments (an application on its node). Default: relationships."
    )
    List<Through> through = new ArrayList<>();

    @SneakyThrows
    @Override
    public void run() {
        Impact.requireDepth(depth);
        val workspace = workspaceFactory.create(
            queryGroup.archiCode.workspaceFilePath.toAbsolutePath(),
            null,
            plateauOption.plateauId
        );

        val graph = GetGraphQuery.buildGraph(workspace);
        val references = new HashSet<String>();
        graph.getElements().forEach(entry -> references.add(entry.getReference()));
        val edges = new ArrayList<Impact.Edge>();
        for (val entry : graph.getRelationships()) {
            val relationship = entry.getRelationship();
            edges.add(
                new Impact.Edge(
                    entry.getSource(),
                    relationship.getDestination(),
                    List.copyOf(relationship.getQualifiers()),
                    relationship.getLabel(),
                    false
                )
            );
        }
        for (val entry : graph.getDeployments()) {
            edges.add(new Impact.Edge(entry.getNode(), entry.getApplication(), List.of(), null, true));
        }

        val request = new Impact.Request(
            reference,
            direction,
            depth,
            qualifiers,
            through
                .stream()
                .map(t -> t.name().toLowerCase(Locale.ROOT))
                .toList()
        );
        val result = Impact.walk(references, edges, request);

        val jsonMapper = mapperFactory.create(MapperFormat.JSON);
        queryOutputWriter.write(jsonMapper.writeValueAsString(result));
    }
}

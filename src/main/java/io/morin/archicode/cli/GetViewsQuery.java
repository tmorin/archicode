package io.morin.archicode.cli;

import com.jayway.jsonpath.JsonPath;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(name = "views", description = "List and filter the views of the workspace.")
@SuppressWarnings("java:S6813")
public class GetViewsQuery implements Runnable {

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

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @CommandLine.Option(
        names = { "-f", "--output-format" },
        paramLabel = "FORMAT",
        defaultValue = "yaml",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The output format.",
        converter = { OutputFormatConverter.class }
    )
    OutputFormat outputFormat;

    @CommandLine.Option(names = { "-q", "--query" }, paramLabel = "QUERY", description = "The query in JSON Path.")
    String query;

    @CommandLine.Option(
        names = { "-t", "--template" },
        paramLabel = "TEMPLATE",
        description = "The template in Velocity with access to data in JSON Path."
    )
    String template;

    @SneakyThrows
    private String filterViews(@NonNull List<View> allViews) {
        val jsonMapper = mapperFactory.create(MapperFormat.JSON);
        val isQuery = Objects.nonNull(query) && !query.isBlank();
        if (isQuery) {
            val allViewsAsJson = jsonMapper.writeValueAsString(allViews);
            val filtererViewAsJson = JsonPath.read(allViewsAsJson, query);
            return jsonMapper.writeValueAsString(filtererViewAsJson);
        }
        return jsonMapper.writeValueAsString(allViews);
    }

    @SneakyThrows
    @Override
    public void run() {
        val workspace = workspaceFactory.create(
            queryGroup.archiCode.workspaceFilePath.toAbsolutePath(),
            null,
            plateauOption.plateauId
        );
        val allViews = new HashSet<>(workspace.getViews());
        allViews.addAll(getBuiltinViews(workspace, workspace.appIndex, View.Layer.APPLICATION));
        allViews.addAll(getBuiltinViews(workspace, workspace.techIndex, View.Layer.TECHNOLOGY));

        val resultAsJson = filterViews(sortViews(allViews));

        if (OutputFormat.CUSTOM.equals(outputFormat)) {
            val resultAsString = QueryOutputWriter.TemplateUtilities.render(template, resultAsJson);
            queryOutputWriter.write(resultAsString);
        } else {
            val resultAsTree = mapperFactory.create(MapperFormat.JSON).readTree(resultAsJson);
            val resultAsString = mapperFactory.create(outputFormat.mapperFormat).writeValueAsString(resultAsTree);
            queryOutputWriter.write(resultAsString);
        }
    }

    /**
     * The order of the views of every format of the command: the identifier, then the layer (application before
     * technology), then, for two views that share both, the viewpoint, the name, the description and the properties.
     * <p>
     * A total order, so that the output is the same from one run to the next and from one build to the next. The views
     * used to be collected in a hash set, and the hash code of a {@link View} holds the identity hash of its layer, an
     * enum, which depends on what the JVM did before.
     */
    private static final Comparator<View> VIEW_ORDER = Comparator.comparing(View::getId)
        .thenComparing(View::getLayer)
        .thenComparing(View::getViewpoint)
        .thenComparing(View::getName, Comparator.nullsFirst(Comparator.naturalOrder()))
        .thenComparing(View::getDescription, Comparator.nullsFirst(Comparator.naturalOrder()))
        .thenComparing(view -> Objects.toString(view.getProperties(), ""));

    /**
     * Sort the given views in the order of the output, see {@link #VIEW_ORDER}.
     *
     * @param views the views, in any order
     * @return the views, sorted, in a new list
     */
    static List<View> sortViews(@NonNull Collection<View> views) {
        return views.stream().sorted(VIEW_ORDER).toList();
    }

    @SneakyThrows
    private Set<View> getBuiltinViews(
        @NonNull Workspace workspace,
        @NonNull ElementIndex index,
        @NonNull View.Layer layer
    ) {
        return index
            .listAllElementReferences(element -> element instanceof Parent<?>)
            .stream()
            .flatMap(reference ->
                viewpointServiceRepository
                    .getAll()
                    .stream()
                    .map(viewpointService ->
                        viewpointService
                            .createViewBuilder(
                                reference,
                                index.getElementByReference(reference),
                                workspace.getSettings().getViews(),
                                null
                            )
                            .map(viewBuilder -> viewBuilder.layer(layer).build())
                    )
                    .filter(Optional::isPresent)
                    .map(Optional::get)
            )
            .collect(Collectors.toSet());
    }
}

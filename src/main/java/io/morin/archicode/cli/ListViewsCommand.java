package io.morin.archicode.cli;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(name = "list", description = "List the views of the workspace.")
public class ListViewsCommand implements Runnable {

    @CommandLine.ParentCommand
    ViewsGroup viewsGroup;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @CommandLine.Option(
        names = { "-f", "--format" },
        paramLabel = "FORMAT",
        defaultValue = "yaml",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The output format.",
        converter = { MapperFormatConverter.class }
    )
    MapperFormat outputFormat;

    @SneakyThrows
    @Override
    public void run() {
        val workspace = workspaceFactory.create(viewsGroup.archiCode.workspaceFilePath);

        val mapper = mapperFactory.create(outputFormat).writerWithDefaultPrettyPrinter();

        val allViews = new HashSet<>(workspace.getViews());
        allViews.addAll(getBuiltinViews(workspace, workspace.appIndex, View.Layer.APPLICATION));
        allViews.addAll(getBuiltinViews(workspace, workspace.depIndex, View.Layer.TECHNOLOGY));

        System.out.println(mapper.writeValueAsString(allViews));
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

package io.morin.archicode.cli;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Optional;
import java.util.Set;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(name = "generate", description = "Generate the views of the workspace.")
public class GenerateViewsCommand implements Runnable {

    @CommandLine.ParentCommand
    ViewsGroup viewsGroup;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @Inject
    MapperFactory mapperFactory;

    @CommandLine.Parameters(description = "The view identifiers to render.", paramLabel = "IDS")
    Set<String> viewIds;

    @CommandLine.Option(
        names = { "-e", "--engine" },
        paramLabel = "ENGINE",
        defaultValue = "plantuml",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The name of the rendering engine."
    )
    String rendererName;

    @CommandLine.Option(
        names = { "-o", "--output" },
        paramLabel = "PATH",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The output directory."
    )
    Path viewsDirPath;

    @CommandLine.Option(
        names = { "-p", "--properties" },
        paramLabel = "PROPERTIES",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "Optional properties of the views."
    )
    String viewPropertiesAsJson;

    @CommandLine.Option(
        names = { "--properties-format" },
        paramLabel = "FORMAT",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        defaultValue = "json",
        description = "The format of the view properties.",
        converter = { MapperFormatConverter.class }
    )
    MapperFormat viewPropertiesFormat;

    @Override
    public void run() {
        val workspace = workspaceFactory.create(viewsGroup.archiCode.workspaceFilePath);

        val outputDirPath = Path.of(
            viewsGroup.archiCode.workspaceFilePath.toFile().getParent(),
            Optional.ofNullable(viewsDirPath).orElse(Path.of(workspace.getSettings().getViews().getPath())).toString()
        );

        for (String viewId : viewIds) {
            workspace.viewIndex
                .searchView(viewId)
                .ifPresent(view -> {
                    log.info("render {}", viewId);
                    val viewpoint = viewpointServiceRepository
                        .get(view.getViewpoint())
                        .createViewpointFactory()
                        .create(workspace, view);
                    renderer.render(viewpoint, rendererName, outputDirPath);
                });
        }

        renderBuiltinViews(workspace, workspace.appIndex, View.Layer.APPLICATION, outputDirPath, viewIds);
        renderBuiltinViews(workspace, workspace.depIndex, View.Layer.TECHNOLOGY, outputDirPath, viewIds);
    }

    @SneakyThrows
    private void renderBuiltinViews(
        @NonNull Workspace workspace,
        @NonNull ElementIndex index,
        @NonNull View.Layer layer,
        @NonNull Path outputDirPath,
        @NonNull Set<String> viewIds
    ) {
        val om = mapperFactory.create(viewPropertiesFormat);
        val properties = (ObjectNode) om.readTree(
            Optional.ofNullable(viewPropertiesAsJson).filter(v -> !v.isEmpty()).orElse("{}")
        );

        index
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
                                properties
                            )
                            .map(viewBuilder -> viewBuilder.layer(layer).build())
                    )
                    .filter(Optional::isPresent)
                    .map(Optional::get)
            )
            .filter(view -> viewIds.isEmpty() || viewIds.contains(view.getViewId()))
            .forEach(view -> {
                log.info("render {}", view.getViewId());
                val viewpoint = viewpointServiceRepository
                    .get(view.getViewpoint())
                    .createViewpointFactory()
                    .create(workspace, view);
                renderer.render(viewpoint, rendererName, outputDirPath);
            });
    }
}

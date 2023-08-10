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
@CommandLine.Command(name = "render")
public class RenderCommand {

    @CommandLine.ParentCommand
    ArchiCodeCommand archiCodeCommand;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @Inject
    MapperFactory mapperFactory;

    @CommandLine.Option(
        names = { "-e", "--renderer" },
        paramLabel = "renderer",
        defaultValue = "plantuml",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The name of the renderer."
    )
    String rendererName;

    @CommandLine.Option(
        names = { "-o", "--output" },
        paramLabel = "path",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The output directory."
    )
    Path viewsDirPath;

    @CommandLine.Option(
        names = { "-p", "--view-properties" },
        paramLabel = "properties",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "Optional properties of the view in JSON."
    )
    String viewPropertiesAsJson;

    @SneakyThrows
    @CommandLine.Command(name = "views", description = "Render views")
    void renderViews(
        @CommandLine.Parameters(description = "The view identifiers to render.") @NonNull Set<String> viewIds
    ) {
        val workspace = workspaceFactory.create(archiCodeCommand.workspaceFilePath);

        val outputDirPath = Path.of(
            archiCodeCommand.workspaceFilePath.toFile().getParent(),
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
        renderBuiltinViews(workspace, workspace.depIndex, View.Layer.DEPLOYMENT, outputDirPath, viewIds);
    }

    @SneakyThrows
    private void renderBuiltinViews(
        @NonNull Workspace workspace,
        @NonNull ElementIndex index,
        @NonNull View.Layer layer,
        @NonNull Path outputDirPath,
        @NonNull Set<String> viewIds
    ) {
        val om = mapperFactory.create(MapperFormat.JSON);
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

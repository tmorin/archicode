package io.morin.archicode.cli;

import static io.morin.archicode.Utilities.call;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.jboss.logmanager.Logger;
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

    @CommandLine.Option(
        names = { "-i", "--view" },
        paramLabel = "VIEW_ID",
        arity = "0..*",
        description = "When specified, render only views matching the given identifier."
    )
    Set<String> viewIds = new HashSet<>();

    @CommandLine.Option(
        names = { "-v", "--viewpoint" },
        paramLabel = "VIEWPOINT_NAME",
        arity = "0..*",
        description = "When specified, render only views matching the given viewpoint name."
    )
    Set<String> viewpointNames = new HashSet<>();

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
        names = { "--properties-content" },
        paramLabel = "PROPERTIES",
        description = "Optional properties of the views."
    )
    String viewPropertiesAsContent;

    @CommandLine.Option(
        names = { "--properties-format" },
        paramLabel = "FORMAT",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        defaultValue = "json",
        description = "The format of the view properties.",
        converter = { MapperFormatConverter.class }
    )
    MapperFormat viewPropertiesFormat;

    @CommandLine.Option(
        names = { "-p", "--properties-path" },
        paramLabel = "PATH",
        description = "The path to optional properties of the views."
    )
    String viewPropertiesAsPath;

    @Override
    public void run() {
        Logger.getGlobal().setLevel(Level.INFO);

        val workspace = workspaceFactory.create(viewsGroup.archiCode.workspaceFilePath.toAbsolutePath(), viewsDirPath);

        if (workspace.getSettings().getFacets().isGlobalEnabled()) {
            renderWorkspace(workspace);
        }

        workspace
            .getSettings()
            .getFacets()
            .getCustoms()
            .forEach(facet -> renderWorkspace(workspaceFactory.create(workspace, facet)));
    }

    public void renderWorkspace(Workspace workspace) {
        log.info("render workspace in {}", workspace.getSettings().getViews().getPath());

        val outputDirPath = Path.of(
            viewsGroup.archiCode.workspaceFilePath.toAbsolutePath().toFile().getParent(),
            workspace.getSettings().getViews().getPath()
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
        renderBuiltinViews(workspace, workspace.techIndex, View.Layer.TECHNOLOGY, outputDirPath, viewIds);
    }

    @SneakyThrows
    private void renderBuiltinViews(
        @NonNull Workspace workspace,
        @NonNull ElementIndex index,
        @NonNull View.Layer layer,
        @NonNull Path outputDirPath,
        @NonNull Set<String> viewIds
    ) {
        val viewProperties = Optional
            .ofNullable(viewPropertiesAsPath)
            .map(p -> viewsGroup.archiCode.workspaceFilePath.toAbsolutePath().toAbsolutePath().getParent().resolve(p))
            .map(p -> call(() -> (ObjectNode) mapperFactory.create(p).readTree(p.toFile())))
            .or(() ->
                Optional
                    .ofNullable(viewPropertiesAsContent)
                    .filter(v -> !v.isEmpty())
                    .map(c -> call(() -> (ObjectNode) mapperFactory.create(viewPropertiesFormat).readTree(c)))
            )
            .orElse(null);

        index
            .listAllElementReferences(element -> true)
            .stream()
            .flatMap(reference ->
                viewpointServiceRepository
                    .getAll()
                    .stream()
                    .filter(viewpointService ->
                        viewpointNames.isEmpty() || viewpointNames.contains(viewpointService.getName())
                    )
                    .map(viewpointService ->
                        viewpointService
                            .createViewBuilder(
                                reference,
                                index.getElementByReference(reference),
                                workspace.getSettings().getViews(),
                                viewProperties
                            )
                            .map(viewBuilder -> viewBuilder.layer(layer).build())
                    )
                    .filter(Optional::isPresent)
                    .map(Optional::get)
            )
            .filter(view -> viewIds.isEmpty() || viewIds.contains(view.getId()))
            .forEach(view -> {
                log.info("render {}", view.getId());
                val viewpoint = viewpointServiceRepository
                    .get(view.getViewpoint())
                    .createViewpointFactory()
                    .create(workspace, view);
                renderer.render(viewpoint, rendererName, outputDirPath);
            });
    }
}

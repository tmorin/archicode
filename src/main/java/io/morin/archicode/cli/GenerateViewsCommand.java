package io.morin.archicode.cli;

import static io.morin.archicode.Utilities.call;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.gap.GapReport;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Removal;
import io.morin.archicode.workspace.StateTags;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
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
@SuppressWarnings("java:S6813")
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

    @Inject
    Warnings warnings;

    @CommandLine.Mixin
    PlateauOption plateauOption = new PlateauOption();

    @CommandLine.Mixin
    AgainstOption againstOption = new AgainstOption();

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
        description = "The output directory: relative to the folder of the workspace file, or absolute. For a workspace with plateaus, the beginning of the name of the folder of each plateau: PATH-<plateau>, and PATH-<plateau>-vs-<against> for a comparison."
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
    @SuppressWarnings("java:S3252")
    public void run() {
        Logger.getGlobal().setLevel(Level.INFO);

        val workspacePath = viewsGroup.archiCode.workspaceFilePath.toAbsolutePath();
        val workspace = workspaceFactory.create(workspacePath, viewsDirPath, plateauOption.plateauId);

        val plateau = workspace.getPlateau();
        if (plateau == null && againstOption.againstId != null) {
            throw new ArchiCodeException(
                "`--against %s` cannot be used: the workspace declares no plateau%s",
                againstOption.againstId,
                WorkspaceFactory.NO_PLATEAU
            );
        }
        // a plateau is compared with the plateau it overrides, or with `--against`: it has one as soon as it is not the root
        // (a comparison doubles the views). Checked before anything is written.
        final String againstId = plateau == null ? null : Against.of(workspace, againstOption.againstId);

        // the views of the workspace, or of the plateau drawn
        renderWorkspaces(workspace, null);

        if (againstId == null) {
            // a state written by hand on a plateau that is not compared
            warnings.warnAll(StateTags.warnings(workspace, null));
            return;
        }
        val base = workspaceFactory.create(workspacePath, viewsDirPath, againstId);
        val comparison = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, workspace);
        // from the plateau already loaded: a comparison loads each of its two plateaus once
        val union = workspaceFactory.withViewsPath(
            workspaceFactory.createUnion(workspace, base, comparison),
            workspace.getSettings().getViews().getPath() + "-vs-" + againstId
        );
        warnings.warnAll(comparison.getWarnings());
        warnings.warnAll(StateTags.warnings(union, comparison));
        writeGap(union, comparison, Removal.cascade(workspace.getRemovals(), base));
        renderWorkspaces(union, comparison);
    }

    /** The table of changes next to the views of the comparison, for a reviewer who reads text. */
    @SneakyThrows
    private void writeGap(Workspace union, Comparison comparison, List<Removal.Effect> cascade) {
        val directory = outputDirectory(union);
        Files.createDirectories(directory);
        for (val gapFormat : List.of(GapFormat.MARKDOWN, GapFormat.JSON)) {
            Files.writeString(
                directory.resolve("gap." + gapFormat.extension()),
                GapReport.render(comparison, gapFormat, false, cascade),
                StandardCharsets.UTF_8
            );
        }
    }

    /** The global views if enabled, then those of each custom facet; the views of a comparison when it is given. */
    private void renderWorkspaces(Workspace workspace, Comparison comparison) {
        if (workspace.getSettings().getFacets().isGlobalEnabled()) {
            renderWorkspace(workspace, comparison);
        }

        workspace
            .getSettings()
            .getFacets()
            .getCustoms()
            .forEach(facet -> renderWorkspace(workspaceFactory.create(workspace, facet, comparison), comparison));
    }

    private Path outputDirectory(Workspace workspace) {
        // a relative path is below the folder of the workspace file; an absolute one is used as it is
        return viewsGroup.archiCode.workspaceFilePath
            .toAbsolutePath()
            .getParent()
            .resolve(workspace.getSettings().getViews().getPath());
    }

    public void renderWorkspace(Workspace workspace) {
        renderWorkspace(workspace, null);
    }

    /**
     * @param workspace  the workspace to draw
     * @param comparison what changed between the two plateaus {@code workspace} is the union of, or null for the views of a
     *                   workspace that compares nothing
     */
    public void renderWorkspace(Workspace workspace, Comparison comparison) {
        log.info("render workspace in {}", workspace.getSettings().getViews().getPath());

        val outputDirPath = outputDirectory(workspace);

        for (String viewId : viewIds) {
            workspace.viewIndex.searchView(viewId).ifPresent(view -> {
                if (!viewpointServiceRepository.has(view.getViewpoint())) {
                    warnings.warn(
                        "skip `%s`: the viewpoint `%s` is not generated by the command line",
                        viewId,
                        view.getViewpoint()
                    );
                    return;
                }
                log.info("render {}", viewId);
                val viewpoint = viewpointServiceRepository
                    .get(view.getViewpoint())
                    .createViewpointFactory(comparison, false)
                    .create(workspace, view);
                renderer.render(viewpoint, rendererName, outputDirPath);
            });
        }

        renderBuiltinViews(workspace, workspace.appIndex, View.Layer.APPLICATION, outputDirPath, viewIds, comparison);
        renderBuiltinViews(workspace, workspace.techIndex, View.Layer.TECHNOLOGY, outputDirPath, viewIds, comparison);
    }

    @SneakyThrows
    private void renderBuiltinViews(
        @NonNull Workspace workspace,
        @NonNull ElementIndex index,
        @NonNull View.Layer layer,
        @NonNull Path outputDirPath,
        @NonNull Set<String> viewIds,
        Comparison comparison
    ) {
        val viewProperties = Optional.ofNullable(viewPropertiesAsPath)
            .map(p -> viewsGroup.archiCode.workspaceFilePath.toAbsolutePath().toAbsolutePath().getParent().resolve(p))
            .map(p -> call(() -> (ObjectNode) mapperFactory.create(p).readTree(p.toFile())))
            .or(() ->
                Optional.ofNullable(viewPropertiesAsContent)
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
                    .filter(
                        viewpointService ->
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
                    .createViewpointFactory(comparison, false)
                    .create(workspace, view);
                renderer.render(viewpoint, rendererName, outputDirPath);
            });
    }
}

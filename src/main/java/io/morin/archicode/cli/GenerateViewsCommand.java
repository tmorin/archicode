package io.morin.archicode.cli;

import static io.morin.archicode.Utilities.call;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.KernelViewpointFactory;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Removal;
import io.morin.archicode.workspace.StateTags;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    // Picocli sets the options on fields, so the services are injected into fields too (the command has no constructor)

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
        names = { "--only-changes" },
        description = "In the views of a comparison (PATH-<plateau>-vs-<against>), draw only what changed: the new, changed, removed, moved, split and merged elements and relationships, the ends of their links, the elements that hold a change, and what encloses them; the context is kept and greyed. The views of the plateau itself are drawn in full, and so is the table of changes. It needs a comparison: a plateau that overrides another one, or --against."
    )
    boolean onlyChanges;

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
        if (onlyChanges && plateau == null) {
            throw new ArchiCodeException(
                "`--only-changes` cannot be used: the workspace declares no plateau, and nothing is compared%s",
                WorkspaceFactory.NO_PLATEAU
            );
        }
        if (onlyChanges && againstId == null) {
            throw new ArchiCodeException(
                "`--only-changes` cannot be used: the plateau `%s` is the root of the plateaus and nothing is before it, so nothing is compared. Name a plateau with `--against`",
                plateau.getId()
            );
        }

        // a view named with `-i` that a facet leaves without its element is a mistake of the command: it is told before the
        // first folder is written, which means the facets (and the comparison) are made before the first view is drawn
        val named = !viewIds.isEmpty();
        val facets = named ? facetWorkspaces(workspace, null) : null;
        Workspace base = null;
        Comparison comparison = null;
        Workspace union = null;
        Map<Settings.Facets.Facet, Workspace> unionFacets = null;
        if (named && againstId != null) {
            base = workspaceFactory.create(workspacePath, viewsDirPath, againstId);
            comparison = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, workspace);
            union = unionOf(workspace, base, comparison, againstId);
            unionFacets = facetWorkspaces(union, comparison);
        }
        if (named) {
            requireViewsKeepTheirElement(workspace, facets);
            if (union != null) {
                requireViewsKeepTheirElement(union, unionFacets);
            }
        }

        // the views of the workspace, or of the plateau drawn
        renderWorkspaces(workspace, null, facets);

        if (againstId == null) {
            // a state written by hand on a plateau that is not compared
            warnings.warnAll(StateTags.warnings(workspace, null));
            return;
        }
        if (base == null) {
            base = workspaceFactory.create(workspacePath, viewsDirPath, againstId);
            comparison = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, workspace);
            // from the plateau already loaded: a comparison loads each of its two plateaus once
            union = unionOf(workspace, base, comparison, againstId);
        }
        warnings.warnAll(comparison.getWarnings());
        warnings.warnAll(StateTags.warnings(union, comparison));
        writeGap(union, comparison, Removal.cascade(workspace.getRemovals(), base));
        renderWorkspaces(union, comparison, unionFacets);
    }

    private Workspace unionOf(Workspace workspace, Workspace base, Comparison comparison, String againstId) {
        return workspaceFactory.withViewsPath(
            workspaceFactory.createUnion(workspace, base, comparison),
            workspace.getSettings().getViews().getPath() + "-vs-" + againstId
        );
    }

    /** The workspace each custom facet makes of the one it is applied to, in the order of the file. */
    private Map<Settings.Facets.Facet, Workspace> facetWorkspaces(Workspace workspace, Comparison comparison) {
        val made = new LinkedHashMap<Settings.Facets.Facet, Workspace>();
        workspace
            .getSettings()
            .getFacets()
            .getCustoms()
            .forEach(facet -> made.put(facet, workspaceFactory.create(workspace, facet, comparison)));
        return made;
    }

    /**
     * A view the command is asked for by its id ({@code -i}) is drawn once for each facet. When a facet removes the element
     * the view is about, the kernel can only say {@code dangling reference: x}, after the folders before it are written and
     * not the ones after it. The author asked for that view by name, so it is not skipped: the command fails, in one line that
     * names the view, the element and the facet, and nothing is written. An element the plateau drawn lacks is not this
     * mistake (the view is skipped with a warning then, see {@code canBeDrawnInPlateau}), and an entry of a map that a facet
     * removes is dropped without a word (issue #68).
     *
     * @param workspace the workspace the facets were applied to
     * @param facets    the workspaces of its facets
     */
    private void requireViewsKeepTheirElement(Workspace workspace, Map<Settings.Facets.Facet, Workspace> facets) {
        for (val viewId : new java.util.TreeSet<>(viewIds)) {
            val found = workspace.viewIndex.searchView(viewId);
            if (found.isEmpty() || !viewpointServiceRepository.has(found.get().getViewpoint())) {
                continue;
            }
            val view = found.get();
            if (KernelViewpointFactory.MAP.equals(view.getViewpoint()) || view.getProperties() == null) {
                continue;
            }
            val element = view.getProperties().path("element").asText("");
            if (element.isBlank() || workspace.resolveMainIndexForView(view).searchElement(element).isEmpty()) {
                continue;
            }
            for (val faceted : facets.entrySet()) {
                if (faceted.getValue().resolveMainIndexForView(view).searchElement(element).isEmpty()) {
                    throw new ArchiCodeException(
                        "the view `%s` cannot be drawn: it names `%s`, which the facet `%s` removes",
                        viewId,
                        element,
                        faceted.getKey().getName()
                    );
                }
            }
        }
    }

    /** The table of changes next to the views of the comparison, for a reviewer who reads text. */
    @SneakyThrows
    private void writeGap(Workspace union, Comparison comparison, List<Removal.Effect> cascade) {
        GapFiles.write(outputDirectory(union), comparison, cascade);
    }

    /**
     * The global views if enabled, then those of each custom facet; the views of a comparison when it is given.
     *
     * @param facets the workspaces of the facets when they are already made, else null
     */
    private void renderWorkspaces(
        Workspace workspace,
        Comparison comparison,
        Map<Settings.Facets.Facet, Workspace> facets
    ) {
        if (workspace.getSettings().getFacets().isGlobalEnabled()) {
            renderWorkspace(workspace, workspace, comparison);
        }

        if (facets != null) {
            facets.values().forEach(faceted -> renderWorkspace(faceted, workspace, comparison));
            return;
        }
        workspace
            .getSettings()
            .getFacets()
            .getCustoms()
            .forEach(facet ->
                renderWorkspace(workspaceFactory.create(workspace, facet, comparison), workspace, comparison)
            );
    }

    private Path outputDirectory(Workspace workspace) {
        // a relative path is below the folder of the workspace file; an absolute one is used as it is
        return viewsGroup.archiCode.workspaceFilePath
            .toAbsolutePath()
            .getParent()
            .resolve(workspace.getSettings().getViews().getPath());
    }

    /** Only the views of a comparison are trimmed: without one the kernel keeps the focal item alone, nothing changed. */
    private boolean drawsOnlyChanges(Comparison comparison) {
        return onlyChanges && comparison != null;
    }

    /**
     * @param plateauWorkspace the workspace of the plateau {@code workspace} is drawn from: itself, or the one a facet was
     *                         applied to (a view cannot be drawn in a plateau that lacks what it names, whatever the facet)
     */
    private void renderWorkspace(Workspace workspace, Workspace plateauWorkspace, Comparison comparison) {
        if (log.isInfoEnabled()) {
            log.info("render workspace in {}", workspace.getSettings().getViews().getPath());
        }

        val outputDirPath = outputDirectory(workspace);

        // in the order of the ids, so that the warnings of a run come out in the same order whatever the hash sequence
        for (String viewId : new java.util.TreeSet<>(viewIds)) {
            workspace.viewIndex.searchView(viewId).ifPresent(view -> {
                if (!viewpointServiceRepository.has(view.getViewpoint())) {
                    warnings.warn(
                        "skip `%s`: the viewpoint `%s` is not generated by the command line",
                        viewId,
                        view.getViewpoint()
                    );
                    return;
                }
                if (!canBeDrawnInPlateau(plateauWorkspace, view)) {
                    return;
                }
                log.info("render {}", viewId);
                val viewpoint = viewpointServiceRepository
                    .get(view.getViewpoint())
                    .createViewpointFactory(comparison, drawsOnlyChanges(comparison))
                    .create(workspace, view);
                renderer.render(viewpoint, rendererName, outputDirPath);
            });
        }

        renderBuiltinViews(workspace, workspace.appIndex, View.Layer.APPLICATION, outputDirPath, viewIds, comparison);
        renderBuiltinViews(workspace, workspace.techIndex, View.Layer.TECHNOLOGY, outputDirPath, viewIds, comparison);
    }

    /**
     * Whether the view can be drawn in the plateau (see {@link ViewInPlateau}); a warning says why not.
     *
     * @return whether the view is to be drawn
     */
    private boolean canBeDrawnInPlateau(Workspace workspace, View view) {
        return ViewInPlateau.canBeDrawn(
            warnings,
            workspace,
            view,
            "`" + view.getId() + "`",
            "the view `" + view.getId() + "`"
        );
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
                if (log.isInfoEnabled()) {
                    log.info("render {}", view.getId());
                }
                val viewpoint = viewpointServiceRepository
                    .get(view.getViewpoint())
                    .createViewpointFactory(comparison, drawsOnlyChanges(comparison))
                    .create(workspace, view);
                renderer.render(viewpoint, rendererName, outputDirPath);
            });
    }
}

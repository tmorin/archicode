package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.KernelViewpointFactory;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.morin.archicode.workspace.Removal;
import io.morin.archicode.workspace.StateTags;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * Draws the steps of the stories (issue #109, decision D6 of wave 018: a command of its own, {@code views generate} does not
 * draw stories). A step is drawn like a view of the plateau it is told at ({@code at}, else the plateau chosen with
 * {@code --plateau} or {@code settings.current}), and like the views of a comparison when it says {@code against}: the same
 * loader, the same {@code compare}, the same viewpoints and the same renderer as {@code views generate}.
 * <p>
 * The files go to {@code <views.path>-stories/<story>/<NN>-<view>/}, {@code NN} being the number of the step (two digits,
 * from 1) and {@code <view>} the id of the view the step names, else the viewpoint of the view it carries. The facets of the
 * settings are drawn as {@code views generate} draws them (issue #140): the global views in that folder (unless
 * {@code global-enabled} is false), one more folder beside it for each facet, named with the template of the facets applied
 * to the name of the step folder ({@code <NN>-<view>-<facet>}), and a step that says {@code against} gets {@code gap.md} and
 * {@code gap.json} in its folder, the table {@code views generate} writes for the same pair. A facet that removes the element
 * a step names is a warning and that facet's folder is skipped.
 */
@Slf4j
@CommandLine.Command(
    name = "generate",
    description = {
        "Draw the steps of the stories of the workspace.",
        "Each step is drawn from the plateau it is told at (at; default: --plateau, else settings.current, else the last plateau when they form one line) and, when it says against, compared with that plateau, as views generate draws the views of a comparison.",
        "The files are written to <views path>-stories/<story>/<NN>-<view>/. A name that the plateau of a step lacks is a warning and the step is skipped."
    }
)
public class GenerateStoriesCommand implements Runnable {

    // Picocli sets the options on fields, so the services are injected into fields too (the command has no constructor)

    @CommandLine.ParentCommand
    StoriesGroup storiesGroup;

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

    @CommandLine.Option(
        names = { "-s", "--story" },
        paramLabel = "STORY_ID",
        description = "Draw only this story, by its identifier; the option may be repeated. Without it every story is drawn."
    )
    List<String> storyIds = new ArrayList<>();

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
        description = "The beginning of the name of the output folder, as for views generate: PATH-stories, relative to the folder of the workspace file, or absolute. Default: the views path of the settings."
    )
    Path viewsDirPath;

    /** The plateaus already loaded, by id, and the comparisons already made, by {@code at} and {@code against}. */
    private final Map<String, Workspace> loaded = new HashMap<>();
    private final Map<String, Compared> compared = new HashMap<>();

    private Path workspacePath;

    /** The workspace of the plateau at the target, the comparison and the workspace that is drawn for it. */
    private record Compared(Comparison comparison, Workspace union, Workspace base) {}

    /** The workspaces the facets make of a plateau or of a comparison, by the same keys as above, in the order of the file. */
    private final Map<String, Map<Settings.Facets.Facet, Workspace>> faceted = new HashMap<>();

    @Override
    public void run() {
        workspacePath = storiesGroup.archiCode.workspaceFilePath.toAbsolutePath();
        val workspace = workspaceFactory.create(workspacePath, viewsDirPath, plateauOption.plateauId);
        loaded.put(idOf(workspace), workspace);

        val stories = workspace.getStories().stream().sorted(Comparator.comparing(Story::getId)).toList();
        val known = stories.stream().map(Story::getId).toList();
        for (val id : new TreeSet<>(storyIds)) {
            if (!known.contains(id)) {
                throw new ArchiCodeException(
                    "no story `%s` in the workspace (%s)",
                    id,
                    known.isEmpty() ? "it has none" : "known: " + String.join(", ", known)
                );
            }
        }
        if (stories.isEmpty()) {
            warnings.warn("the workspace has no story: nothing is drawn");
            return;
        }
        for (val story : stories) {
            if (!storyIds.isEmpty() && !storyIds.contains(story.getId())) {
                continue;
            }
            draw(workspace, story);
        }
    }

    private void draw(Workspace workspace, Story story) {
        if (story.getSteps().isEmpty()) {
            warnings.warn("skip `%s`: the story has no step", story.getId());
            return;
        }
        val root = outputRoot(workspace).resolve(story.getId());
        var number = 0;
        for (val step : story.getSteps()) {
            number++;
            drawStep(workspace, story, step, number, root);
        }
    }

    /** {@code <views.path>-stories}: the views path the settings (or {@code --output}) say, without the plateau a layered workspace adds. */
    private Path outputRoot(Workspace workspace) {
        var path = workspace.getSettings().getViews().getPath();
        if (workspace.getPlateau() != null && path.endsWith("-" + workspace.getPlateau().getId())) {
            path = path.substring(0, path.length() - workspace.getPlateau().getId().length() - 1);
        }
        return workspacePath.getParent().resolve(path + "-stories");
    }

    private void drawStep(Workspace drawn, Story story, Story.Step step, int number, Path root) {
        val label = story.getId() + "/" + number;
        val view = viewOf(drawn, step, label, number);
        if (view == null) {
            return;
        }
        if (!viewpointServiceRepository.has(view.getViewpoint())) {
            warnings.warn(
                "skip %s: the viewpoint `%s` is not generated by the command line",
                label,
                view.getViewpoint()
            );
            return;
        }
        val at = step.getAt() == null || step.getAt().isEmpty() ? idOf(drawn) : step.getAt();
        val against = step.getAgainst() == null || step.getAgainst().isEmpty() ? null : step.getAgainst();
        if (at.equals(against)) {
            warnings.warn(
                "skip %s: it is told at the plateau `%s` and compared with it: there is nothing to compare",
                label,
                at
            );
            return;
        }
        val workspace = plateau(at);
        if (!ViewInPlateau.canBeDrawn(warnings, workspace, view, label, "the step " + label)) {
            return;
        }
        var from = workspace;
        Compared made = null;
        Comparison comparison = null;
        if (against != null) {
            made = compare(at, against);
            comparison = made.comparison();
            from = made.union();
        }
        val folder = root.resolve(
            "%02d-%s".formatted(number, step.getView() != null ? step.getView() : view.getViewpoint())
        );
        val settings = workspace.getSettings().getFacets();
        if (settings.isGlobalEnabled()) {
            drawIn(from, view, comparison, folder, label);
        } else if (settings.getCustoms().isEmpty()) {
            // the same as views generate: no global views and no facet leave nothing to draw (said once, whichever the step)
            warnings.warn(
                "the global views are turned off (`global-enabled: false`) and the workspace has no facet: the steps of the stories are not drawn"
            );
        }
        if (!settings.getCustoms().isEmpty()) {
            final Compared pair = made;
            val key = pair == null ? at : at + "\u0000" + against;
            val facets = faceted.computeIfAbsent(key, k ->
                facetWorkspaces(pair == null ? workspace : pair.union(), pair == null ? null : pair.comparison())
            );
            // the folder of a facet sits beside the folder of the step, as the folder of a facet sits beside the views folder
            // (the template of the facets applied to the folder of the step)
            for (val entry : facets.entrySet()) {
                val facet = entry.getKey();
                if (facetRemovesWhatTheStepNames(workspace, entry.getValue(), view, facet, label)) {
                    continue;
                }
                val facetFolder = root.resolve(
                    String.format(settings.getDirectoryNameTemplate(), folder.getFileName().toString(), facet.getName())
                );
                drawIn(entry.getValue(), view, comparison, facetFolder, label);
            }
        }
        if (made != null) {
            // the table of changes of the pair the step compares, next to the views of the step, as views generate writes it next to its comparison
            try {
                GapFiles.write(folder, made.comparison(), Removal.cascade(workspace.getRemovals(), made.base()));
            } catch (java.io.IOException e) {
                throw new java.io.UncheckedIOException(e);
            }
        }
    }

    private void drawIn(Workspace from, View view, Comparison comparison, Path folder, String label) {
        log.info("render {} in {}", label, folder);
        val viewpoint = viewpointServiceRepository
            .get(view.getViewpoint())
            .createViewpointFactory(comparison, false)
            .create(from, view);
        renderer.render(viewpoint, rendererName, folder);
    }

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
     * A facet that removes the element a step names cannot draw the step (the kernel could only say {@code dangling reference}):
     * that facet's folder is skipped, with a warning, the others are drawn. An entry of a map that a facet removes is dropped
     * without a word, as in {@code views generate}.
     */
    private boolean facetRemovesWhatTheStepNames(
        Workspace plateau,
        Workspace faceted,
        View view,
        Settings.Facets.Facet facet,
        String label
    ) {
        if (KernelViewpointFactory.MAP.equals(view.getViewpoint()) || view.getProperties() == null) {
            return false;
        }
        val element = view.getProperties().path("element").asText("");
        if (
            element.isBlank() ||
            plateau.resolveMainIndexForView(view).searchElement(element).isEmpty() ||
            faceted.resolveMainIndexForView(view).searchElement(element).isPresent()
        ) {
            return false;
        }
        warnings.warn(
            "skip %s in the facet `%s`: it names `%s`, which the facet removes",
            label,
            facet.getName(),
            element
        );
        return true;
    }

    /** The view a step draws: the one it names, else the one it carries; null (with a warning) when it has none. */
    private View viewOf(Workspace workspace, Story.Step step, String label, int number) {
        if (step.getView() != null) {
            val found = workspace.viewIndex.searchView(step.getView());
            if (found.isEmpty()) {
                warnings.warn("skip %s: the view `%s` is not declared", label, step.getView());
            }
            return found.orElse(null);
        }
        if (step.getViewpoint() == null || step.getViewpoint().isBlank()) {
            warnings.warn("skip %s: it names no view and carries no viewpoint", label);
            return null;
        }
        return View.builder()
            .id("step_%02d".formatted(number))
            .viewpoint(step.getViewpoint())
            .layer(step.getLayer() == null ? View.Layer.APPLICATION : step.getLayer())
            .name(step.getName())
            .properties(step.getProperties())
            .build();
    }

    private static String idOf(Workspace workspace) {
        return workspace.getPlateau() == null ? "" : workspace.getPlateau().getId();
    }

    /** A plateau is loaded once, whatever the number of steps told there. */
    private Workspace plateau(String id) {
        val drawn = loaded.get("");
        if (drawn != null) {
            return drawn;
        }
        return loaded.computeIfAbsent(id, key -> workspaceFactory.create(workspacePath, viewsDirPath, key));
    }

    /** A comparison is made once, whatever the number of steps told with it. */
    private Compared compare(String at, String against) {
        return compared.computeIfAbsent(at + "\u0000" + against, key -> {
            val target = plateau(at);
            val base = plateau(against);
            val comparison = new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON)).compare(base, target);
            val union = workspaceFactory.createUnion(target, base, comparison);
            warnings.warnAll(comparison.getWarnings());
            warnings.warnAll(StateTags.warnings(union, comparison));
            return new Compared(comparison, union, base);
        });
    }
}

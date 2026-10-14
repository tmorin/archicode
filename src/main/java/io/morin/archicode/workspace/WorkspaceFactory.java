package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.util.RawValue;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.workspace.Settings.Facets.Facet;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class WorkspaceFactory {

    MapperFactory mapperFactory;
    ManifestParser manifestParser;

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(
        Workspace resources,
        Map<Class<?>, Set<ManifestParser.Candidate>> manifests
    ) {
        log.debug("index the application elements");
        val appIndex = ElementIndexFactory.builder()
            .root(resources.getApplication())
            .candidates(manifests.getOrDefault(Application.class, Set.of()))
            .build()
            .create();

        log.debug("index the technology elements");
        val depIndex = ElementIndexFactory.builder()
            .root(resources.getTechnology())
            .candidates(manifests.getOrDefault(Technology.class, Set.of()))
            .build()
            .create();

        log.debug("index the views");
        val viewIndex = ViewIndexFactory.builder().views(resources.getViews()).build().create();

        resources.getStories().forEach(story ->
            story
                .getSteps()
                .stream()
                .filter(step -> step.getView() != null && viewIndex.searchView(step.getView()).isEmpty())
                .forEach(step ->
                    log.warn(
                        "the story {} has a step on the view {}, which is not declared",
                        story.getId(),
                        step.getView()
                    )
                )
        );

        return io.morin.archicode.workspace.Workspace.builder()
            .resources(resources)
            .appIndex(appIndex)
            .techIndex(depIndex)
            .viewIndex(viewIndex)
            .build();
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path) {
        return create(path, null);
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path, Path viewsDirPath) {
        return create(path, viewsDirPath, null);
    }

    /**
     * Read a workspace file and its manifests.
     *
     * @param path         the workspace file
     * @param viewsDirPath the folder the views are written to, or null for the one of the settings
     * @param plateauId    the plateau to read ({@code --plateau}), or null for {@code settings.current}, else the last
     *                     one of {@code settings.plateaus}; it must be null for a workspace that has no plateaus
     */
    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path, Path viewsDirPath, String plateauId) {
        log.info("parse the resources {}", path);

        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
        // what the author wrote: the plateaus are checked on it, and so is whether `manifests.paths` is written (its
        // default is not, and does not count)
        val tree = workspaceMapper.readTree(path.toFile());
        val structure = Plateaus.checkStructure(tree.path("settings").path("plateaus"));
        if (!structure.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", structure));
        }
        val manifestsPathsWritten = tree.path("settings").path("manifests").has("paths");
        val rawWorkspace = workspaceMapper.readValue(path.toFile(), Workspace.class);

        val fixedRawWorkspace = Optional.ofNullable(viewsDirPath)
            .map(newViewsPath ->
                rawWorkspace
                    .toBuilder()
                    .settings(
                        rawWorkspace
                            .getSettings()
                            .toBuilder()
                            .views(
                                rawWorkspace.getSettings().getViews().toBuilder().path(newViewsPath.toString()).build()
                            )
                            .build()
                    )
                    .build()
            )
            .orElse(rawWorkspace);

        // the plateau to read; none for a workspace that has one set of manifests (manifests.paths)
        val wksDir = path.toFile().getParentFile().toPath();
        val selection = Plateaus.select(fixedRawWorkspace.getSettings(), manifestsPathsWritten, plateauId);
        val manifestsDirs =
            selection == null
                ? fixedRawWorkspace.getSettings().getManifests().getPaths()
                : Set.of(selection.path().isEmpty() ? "." : selection.path());
        if (selection != null && !wksDir.resolve(manifestsDirs.iterator().next()).toFile().isDirectory()) {
            throw new ArchiCodeException(
                "the folder `%s` of the plateau `%s` does not exist",
                selection.path(),
                selection.plateau().getId()
            );
        }
        if (selection != null) {
            log.info("read the plateau {} from {}", selection.plateau().getId(), selection.path());
        }

        // parse the manifests: the elements, and the views and the stories that are manifests of their own, which join
        // the ones of workspace.yaml. One call per plateau: a reference declared twice is an error inside a plateau,
        // and the same reference in two plateaus is the very point of having two
        val manifests = manifestParser.parse(wksDir, manifestsDirs, path);

        return create(
            fixedRawWorkspace.toBuilder().views(manifests.views()).stories(manifests.stories()).build(),
            manifests.elements()
        )
            .toBuilder()
            .plateau(selection == null ? null : selection.plateau())
            .build();
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(
        io.morin.archicode.workspace.Workspace workspace,
        Facet facet
    ) {
        log.info("process {}", facet);

        val jsonMapper = mapperFactory.create(MapperFormat.JSON);
        val refWorkspaceAsJson = jsonMapper.writeValueAsString(workspace);
        val facetRawWorkspace = jsonMapper
            .readValue(refWorkspaceAsJson, Workspace.class)
            .toBuilder()
            .settings(
                workspace
                    .getSettings()
                    .toBuilder()
                    .views(
                        workspace
                            .getSettings()
                            .getViews()
                            .toBuilder()
                            .path(
                                String.format(
                                    workspace.getSettings().getFacets().getDirectoryNameTemplate(),
                                    workspace.getSettings().getViews().getPath(),
                                    facet.getName()
                                )
                            )
                            .build()
                    )
                    .build()
            )
            .build();
        val facetRawWorkspaceAsJson = jsonMapper.writeValueAsString(facetRawWorkspace);

        val request = jsonMapper.createObjectNode();
        // the workspace goes to the kernel as it is written: it is not parsed just to be written again
        request.putRawValue("workspace", new RawValue(facetRawWorkspaceAsJson));
        val actions = request.putArray("actions");
        for (val action : facet.getActions()) {
            log.info("process {}", action);
            val node = actions.addObject();
            node.put("operator", action.getOperator().name());
            node.put("json_path", action.getJsonPath());
        }

        // the facets are evaluated by the viewpoint kernel, the very code the editor runs
        val answer = jsonMapper.readTree(
            ViewpointKernel.getInstance().applyFacet(jsonMapper.writeValueAsString(request))
        );
        if (answer.has("error")) {
            throw new ArchiCodeException("facet %s: %s", facet.getName(), answer.get("error").asText());
        }
        if (answer.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, expected %s",
                answer.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }
        answer.path("warnings").forEach(warning -> log.warn("facet {}: {}", facet.getName(), warning.asText()));

        val facetWorkspace = jsonMapper.treeToValue(answer.get("workspace"), Workspace.class);

        return create(facetWorkspace, Map.of())
            .toBuilder()
            .faceted(true)
            .hideUnlinked(facet.isHideUnlinked())
            .plateau(workspace.getPlateau())
            .build();
    }
}

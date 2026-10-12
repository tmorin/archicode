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
        log.info("parse the resources {}", path);

        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
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

        // parse the manifests: the elements, and the views and the stories that are manifests of their own, which join
        // the ones of workspace.yaml
        val manifests = manifestParser.parse(
            path.toFile().getParentFile().toPath(),
            fixedRawWorkspace.getSettings().getManifests().getPaths()
        );

        return create(
            fixedRawWorkspace.toBuilder().views(manifests.views()).stories(manifests.stories()).build(),
            manifests.elements()
        );
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

        return create(facetWorkspace, Map.of()).toBuilder().faceted(true).hideUnlinked(facet.isHideUnlinked()).build();
    }
}

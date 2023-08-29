package io.morin.archicode.workspace;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.util.Map;
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
        val appIndex = ElementIndexFactory
            .builder()
            .root(resources.getApplication())
            .candidates(manifests.getOrDefault(Application.class, Set.of()))
            .build()
            .create();

        log.debug("index the technology elements");
        val depIndex = ElementIndexFactory
            .builder()
            .root(resources.getTechnology())
            .candidates(manifests.getOrDefault(Technology.class, Set.of()))
            .build()
            .create();

        log.debug("index the views");
        val viewIndex = ViewIndexFactory.builder().views(resources.getViews()).build().create();

        return io.morin.archicode.workspace.Workspace
            .builder()
            .resources(resources)
            .appIndex(appIndex)
            .techIndex(depIndex)
            .viewIndex(viewIndex)
            .build();
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path) {
        log.info("parse the resources {}", path);

        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
        val rawWorkspace = workspaceMapper.readValue(path.toFile(), Workspace.class);

        // parse the manifests
        val manifests = manifestParser.parse(
            path.toFile().getParentFile().toPath(),
            rawWorkspace.getSettings().getManifests().getPaths()
        );

        return create(rawWorkspace, manifests);
    }
}

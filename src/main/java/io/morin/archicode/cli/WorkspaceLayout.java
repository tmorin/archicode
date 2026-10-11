package io.morin.archicode.cli;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.resource.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;

/**
 * Resolves where a workspace's files live on disk, without building the fully-indexed workspace.
 * <p>
 * Extracted from {@link EditorHttpServer}, which performed both resolutions privately, so that
 * {@link ClaudeBridge} can reuse them for its pre-flight containment check without a circular injection
 * (run-0007 TDD {@code DEC-8}). Behaviour is identical to the code it replaces — in particular
 * {@link #manifestsDirs(Path)} deliberately performs <strong>no existence check</strong>: it maps every
 * configured path against the workspace directory and leaves it to each caller to apply its own
 * {@code Files.isDirectory} guard, exactly as {@code EditorHttpServer} already did.
 */
@ApplicationScoped
public class WorkspaceLayout {

    @Inject
    MapperFactory mapperFactory;

    /**
     * The directory holding the workspace file — the directory every manifest path, and the Claude bridge's
     * whole containment and capture boundary, is relative to.
     *
     * @param workspaceFilePath the workspace file
     * @return its absolute, normalized parent directory
     */
    public Path workspaceDir(@NonNull Path workspaceFilePath) {
        return workspaceFilePath.toAbsolutePath().normalize().getParent();
    }

    /**
     * Resolve {@code settings.manifests.paths} by parsing only the raw workspace resource — the same first step
     * {@link io.morin.archicode.workspace.WorkspaceFactory#create(Path)} performs before manifest parsing or
     * index building, so an unrelated dangling reference never blocks reading or fixing a manifest.
     * <p>
     * No existence check is performed; a configured directory that is absent on disk is still returned.
     *
     * @param workspaceFilePath the workspace file
     * @return each configured manifests path, resolved against the workspace directory
     */
    @SneakyThrows
    public List<Path> manifestsDirs(@NonNull Path workspaceFilePath) {
        val workspaceDir = workspaceDir(workspaceFilePath);
        val rawMapper = mapperFactory.create(workspaceFilePath);
        val rawWorkspace = rawMapper.readValue(workspaceFilePath.toFile(), Workspace.class);
        return rawWorkspace.getSettings().getManifests().getPaths().stream().map(workspaceDir::resolve).toList();
    }
}

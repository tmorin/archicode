package io.morin.archicode.importer;

import java.util.List;

/**
 * The content of {@code .archicode.yaml}: the part of the settings the import writes.
 *
 * @param settings the settings
 */
public record WorkspaceFile(Settings settings) {
    /**
     * The settings.
     *
     * @param name      the name of the workspace
     * @param manifests where the manifests are
     */
    public record Settings(String name, Manifests manifests) {}

    /**
     * The folders of the manifests.
     *
     * @param paths the paths, relative to the workspace file
     */
    public record Manifests(List<String> paths) {}
}

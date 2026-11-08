package io.morin.archicode.importer;

import io.morin.archicode.manifest.Manifest;

/**
 * A manifest and the path, relative to the workspace folder, where it is written.
 *
 * @param path     {@code manifests/<reference>.yaml}
 * @param manifest the manifest
 */
public record Planned(String path, Manifest manifest) {}

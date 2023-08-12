package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum OutputFormat {
    YAML(MapperFormat.YAML),
    TOML(MapperFormat.TOML),
    JSON(MapperFormat.JSON),
    CUSTOM(null);

    final MapperFormat mapperFormat;
}

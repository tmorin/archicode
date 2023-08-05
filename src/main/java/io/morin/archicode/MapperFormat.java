package io.morin.archicode;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Getter
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public enum MapperFormat {
    YAML(".yaml", ".yml"),
    TOML(".toml"),
    JSON(".json");

    Set<String> extensions;

    MapperFormat(String... extensions) {
        this.extensions = Set.of(extensions);
    }

    public static Optional<MapperFormat> resolve(Path path) {
        return resolve(path.toString());
    }

    public static Optional<MapperFormat> resolve(String path) {
        return Arrays
            .stream(MapperFormat.values())
            .filter(format -> format.extensions.stream().anyMatch(path::endsWith))
            .findFirst();
    }
}

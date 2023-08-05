package io.morin.archicode.manifest;

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
public enum ResourceFormat {
    YAML(".yaml", ".yml"),
    TOML(".toml"),
    JSON(".json");

    Set<String> extensions;

    ResourceFormat(String... extensions) {
        this.extensions = Set.of(extensions);
    }

    public static Optional<ResourceFormat> resolve(Path path) {
        return resolve(path.toString());
    }

    public static Optional<ResourceFormat> resolve(String path) {
        return Arrays
            .stream(ResourceFormat.values())
            .filter(format -> format.extensions.stream().anyMatch(path::endsWith))
            .findFirst();
    }
}

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

    /**
     * The extensions of the format.
     */
    Set<String> extensions;

    /**
     * Create a new {@link MapperFormat} with the given extensions.
     *
     * @param extensions the extensions of the format
     */
    MapperFormat(String... extensions) {
        this.extensions = Set.of(extensions);
    }

    /**
     * Resolve the {@link MapperFormat} from the given path.
     *
     * @param path the path to resolve
     * @return the resolved {@link MapperFormat}
     */
    public static Optional<MapperFormat> resolve(Path path) {
        return resolve(path.toString());
    }

    /**
     * Resolve the {@link MapperFormat} from the given path.
     *
     * @param path the path to resolve
     * @return the resolved {@link MapperFormat}
     */
    public static Optional<MapperFormat> resolve(String path) {
        return Arrays
            .stream(MapperFormat.values())
            .filter(format -> format.extensions.stream().anyMatch(path::endsWith))
            .findFirst();
    }
}

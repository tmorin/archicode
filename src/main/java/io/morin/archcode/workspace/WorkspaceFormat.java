package io.morin.archcode.workspace;

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
public enum WorkspaceFormat {
    YAML(".yaml", ".yml"),
    TOML(".toml"),
    JSON(".json");

    WorkspaceFormat(String... extensions) {
        this.extensions = Set.of(extensions);
    }

    Set<String> extensions;

    public static Optional<WorkspaceFormat> resolve(Path path) {
        return Arrays
            .stream(WorkspaceFormat.values())
            .filter(format -> format.extensions.stream().anyMatch(other -> path.toString().endsWith(other)))
            .findFirst();
    }
}

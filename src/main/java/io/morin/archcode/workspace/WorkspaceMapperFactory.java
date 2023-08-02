package io.morin.archcode.workspace;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.dataformat.toml.TomlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.morin.archcode.ArchcodeException;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class WorkspaceMapperFactory {

    YAMLMapper yamlMapper = YAMLMapper.builder().serializationInclusion(JsonInclude.Include.NON_NULL).build();
    TomlMapper tomlMapper = TomlMapper.builder().serializationInclusion(JsonInclude.Include.NON_NULL).build();
    JsonMapper jsonMapper = JsonMapper.builder().serializationInclusion(JsonInclude.Include.NON_NULL).build();

    public ObjectMapper create(Path path) {
        val workspaceFormat = WorkspaceFormat
            .resolve(path)
            .orElseThrow(() -> new ArchcodeException("The workspace file `%s` doesn't match a handled format.", path));
        switch (workspaceFormat) {
            case YAML -> {
                return yamlMapper;
            }
            case TOML -> {
                return tomlMapper;
            }
            case JSON -> {
                return jsonMapper;
            }
            default -> throw new IllegalStateException("Unexpected value: " + workspaceFormat);
        }
    }
}

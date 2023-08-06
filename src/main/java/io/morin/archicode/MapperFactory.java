package io.morin.archicode;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.EnumFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.dataformat.toml.TomlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class MapperFactory {

    YAMLMapper yamlMapper = YAMLMapper
        .builder()
        .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
        .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
        .serializationInclusion(JsonInclude.Include.NON_EMPTY)
        .build();
    TomlMapper tomlMapper = TomlMapper
        .builder()
        .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
        .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
        .serializationInclusion(JsonInclude.Include.NON_EMPTY)
        .build();
    JsonMapper jsonMapper = JsonMapper
        .builder()
        .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
        .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
        .serializationInclusion(JsonInclude.Include.NON_EMPTY)
        .build();

    public ObjectMapper create(MapperFormat format) {
        switch (format) {
            case YAML -> {
                return yamlMapper;
            }
            case TOML -> {
                return tomlMapper;
            }
            case JSON -> {
                return jsonMapper;
            }
            default -> throw new IllegalStateException("Unexpected value: " + format);
        }
    }

    public ObjectMapper create(Path path) {
        val format = MapperFormat
            .resolve(path)
            .orElseThrow(() -> new ArchiCodeException("The path `%s` doesn't match a handled format.", path));
        return create(format);
    }
}

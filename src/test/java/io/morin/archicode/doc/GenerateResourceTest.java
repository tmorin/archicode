package io.morin.archicode.doc;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.resource.workspace.Workspace;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GenerateResourceTest {

    @Inject
    MapperFactory mapperFactory;

    ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = mapperFactory.create(MapperFormat.YAML);
    }

    @Test
    @SneakyThrows
    void generateDefaultWorkspace() {
        val workspace = Workspace.builder()
            .styles(Styles.builder().atomic(Styles.Style.builder().build()).build())
            .build();
        val workspaceAsYaml = Assertions.assertDoesNotThrow(() ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(workspace).replace("---", "").trim()
        );
        Files.writeString(Path.of("src/doc/examples/domain_workspace/default.yaml"), workspaceAsYaml);
    }

    @Test
    @SneakyThrows
    void generateDefaultSettings() {
        val resource = Settings.builder().build();
        val resourceAsTree = objectMapper.valueToTree(resource);
        val workspace = objectMapper.createObjectNode().set("settings", resourceAsTree);
        val resourceAsYaml = Assertions.assertDoesNotThrow(() ->
            mapperFactory
                .create(MapperFormat.YAML)
                .writerWithDefaultPrettyPrinter()
                .writeValueAsString(workspace)
                .replace("---", "")
                .trim()
        );
        Files.writeString(Path.of("src/doc/examples/domain_configuration/default_settings.yaml"), resourceAsYaml);
    }

    @Test
    @SneakyThrows
    void generateDefaultStyles() {
        val resource = Styles.builder().build();
        val resourceAsTree = objectMapper.valueToTree(resource);
        val workspace = objectMapper.createObjectNode().set("styles", resourceAsTree);
        val resourceAsYaml = Assertions.assertDoesNotThrow(() ->
            mapperFactory
                .create(MapperFormat.YAML)
                .writerWithDefaultPrettyPrinter()
                .writeValueAsString(workspace)
                .replace("---", "")
                .trim()
        );
        Files.writeString(Path.of("src/doc/examples/domain_configuration/default_styles.yaml"), resourceAsYaml);
    }

    @Test
    @SneakyThrows
    void generateDefaultFormatter() {
        val resource = Formatters.builder().build();
        val resourceAsTree = objectMapper.valueToTree(resource);
        val workspace = objectMapper.createObjectNode().set("formatters", resourceAsTree);
        val resourceAsYaml = Assertions.assertDoesNotThrow(() ->
            mapperFactory
                .create(MapperFormat.YAML)
                .writerWithDefaultPrettyPrinter()
                .writeValueAsString(workspace)
                .replace("---", "")
                .trim()
        );
        Files.writeString(Path.of("src/doc/examples/domain_configuration/default_formatters.yaml"), resourceAsYaml);
    }
}

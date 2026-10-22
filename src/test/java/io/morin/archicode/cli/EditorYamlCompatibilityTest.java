package io.morin.archicode.cli;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * The standalone editor writes the manifests and the {@code .archicode.yaml} with its own YAML emitter. The golden cases
 * of {@code src/test/resources/editor-yaml/emitter-cases.json} pair a value with the exact text the emitter writes for
 * it (as the value of the key {@code k}); the editor's own tests ({@code yaml.test.js}) check the emitter and its parser
 * against them, and this test checks that the CLI reads every one of them, with the project's YAML mapper, as the very
 * same value: what the editor writes is what the CLI reads.
 */
class EditorYamlCompatibilityTest {

    private static final Path CASES = Path.of("src/test/resources/editor-yaml/emitter-cases.json");

    private final MapperFactory mapperFactory = new MapperFactory();

    @Test
    @SneakyThrows
    void shouldReadWhatTheEditorWritesAsTheSameValue() {
        val yamlMapper = mapperFactory.create(MapperFormat.YAML);
        val cases = mapperFactory.create(MapperFormat.JSON).readTree(Files.readString(CASES));
        Assertions.assertTrue(cases.size() > 50, "the golden cases are missing");
        for (JsonNode golden : cases) {
            val yaml = golden.get("yaml").asText();
            JsonNode read = null;
            try {
                read = yamlMapper.readTree(yaml);
            } catch (Exception e) {
                Assertions.fail("the CLI cannot read what the editor writes:\n" + yaml + "\n" + e.getMessage());
            }
            Assertions.assertEquals(
                golden.get("value"),
                read.get("k"),
                "the CLI reads something else than the editor wrote:\n" + yaml
            );
        }
    }

    @Test
    @SneakyThrows
    void shouldReadEmptyCollectionsAsEmptyCollectionsNotAsNull() {
        val yamlMapper = mapperFactory.create(MapperFormat.YAML);
        val read = yamlMapper.readTree(
            "elements: []\nrelationships: []\ntags: {}\nitems:\n  - qualifiers: []\n    tags: {}"
        );
        Assertions.assertTrue(read.get("elements").isArray());
        Assertions.assertTrue(read.get("relationships").isArray());
        Assertions.assertTrue(read.get("tags").isObject());
        Assertions.assertTrue(read.get("items").get(0).get("qualifiers").isArray());
        Assertions.assertTrue(read.get("items").get(0).get("tags").isObject());
    }
}

package io.morin.archicode.resource.workspace;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class SettingsTest {

    private final MapperFactory mapperFactory = new MapperFactory();

    @Test
    @SneakyThrows
    void shouldReadTheNameOfTheWorkspace() {
        val settings = mapperFactory.create(MapperFormat.YAML).readValue("name: \"Shop\"\n", Settings.class);
        Assertions.assertEquals("Shop", settings.getName());
    }

    @Test
    @SneakyThrows
    void shouldStayValidWithoutAName() {
        val settings = mapperFactory.create(MapperFormat.YAML).readValue("views:\n  path: \"out\"\n", Settings.class);
        Assertions.assertNull(settings.getName());
        Assertions.assertEquals("out", settings.getViews().getPath());
        Assertions.assertNull(Settings.builder().build().getName());
    }

    @Test
    @SneakyThrows
    void shouldNotWriteTheNameWhenThereIsNone() {
        val yamlMapper = mapperFactory.create(MapperFormat.YAML);
        Assertions.assertFalse(yamlMapper.valueToTree(Settings.builder().build()).has("name"));
        val named = yamlMapper.valueToTree(Settings.builder().name("Shop").build());
        Assertions.assertEquals("Shop", named.get("name").asText());
    }
}

package io.morin.archicode;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.dataformat.toml.TomlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.System;
import java.nio.file.Path;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The mappers of the three formats: one strict and one lazy (which leaves the keys it does not know) for each, chosen by
 * the format or by the extension of a path, and how they read the elements of a layer.
 */
class MapperFactoryTest {

    private final MapperFactory factory = new MapperFactory();

    @Test
    void shouldGiveTheMapperOfEachFormat() {
        assertInstanceOf(YAMLMapper.class, factory.create(MapperFormat.YAML));
        assertInstanceOf(TomlMapper.class, factory.create(MapperFormat.TOML));
        assertInstanceOf(JsonMapper.class, factory.create(MapperFormat.JSON));
        assertInstanceOf(YAMLMapper.class, factory.createLazy(MapperFormat.YAML));
        assertInstanceOf(TomlMapper.class, factory.createLazy(MapperFormat.TOML));
        assertInstanceOf(JsonMapper.class, factory.createLazy(MapperFormat.JSON));
        assertSame(factory.create(MapperFormat.JSON), factory.create(MapperFormat.JSON), "one mapper per format");
        assertNotSame(factory.create(MapperFormat.JSON), factory.createLazy(MapperFormat.JSON));
    }

    @Test
    void shouldChooseTheMapperFromTheExtensionOfAPath() {
        assertSame(factory.create(MapperFormat.YAML), factory.create(Path.of("a", "b.yaml")));
        assertSame(factory.create(MapperFormat.YAML), factory.create(Path.of("a", "b.yml")));
        assertSame(factory.create(MapperFormat.TOML), factory.create(Path.of("b.toml")));
        assertSame(factory.create(MapperFormat.JSON), factory.create(Path.of("b.json")));
    }

    @Test
    void shouldRefuseAPathWhoseExtensionIsNoFormat() {
        val e = assertThrows(ArchiCodeException.class, () -> factory.create(Path.of("notes.txt")));
        assertEquals("The path `notes.txt` doesn't match a handled format.", e.getMessage());
    }

    @Test
    void shouldRefuseAKeyItDoesNotKnowUnlessTheMapperIsLazy() throws JsonProcessingException {
        val json = "{\"elements\": [], \"colour\": \"red\"}";
        val strict = assertThrows(JsonProcessingException.class, () ->
            factory.create(MapperFormat.JSON).readValue(json, Application.class)
        );
        assertTrue(strict.getMessage().contains("colour"), strict.getMessage());
        assertDoesNotThrow(() -> factory.createLazy(MapperFormat.JSON).readValue(json, Application.class));

        val yaml = "elements: []\ncolour: red\n";
        assertThrows(JsonProcessingException.class, () ->
            factory.create(MapperFormat.YAML).readValue(yaml, Application.class)
        );
        assertDoesNotThrow(() -> factory.createLazy(MapperFormat.YAML).readValue(yaml, Application.class));

        val toml = "colour = \"red\"\n";
        assertThrows(JsonProcessingException.class, () ->
            factory.create(MapperFormat.TOML).readValue(toml, Application.class)
        );
        assertDoesNotThrow(() -> factory.createLazy(MapperFormat.TOML).readValue(toml, Application.class));
    }

    @Test
    void shouldReadAnElementByItsKind() throws JsonProcessingException {
        val app = factory
            .create(MapperFormat.JSON)
            .readValue("{\"elements\": [{\"kind\": \"system\", \"id\": \"shop\"}]}", Application.class);
        val element = app.getElements().iterator().next();
        assertInstanceOf(System.class, element);
        assertEquals("shop", ((System) element).getId());
    }

    @Test
    void shouldNotReadAnElementFromTheArrayFormOfATypeId() {
        // Jackson would read [kind, {...}] as a type id and its value: an element is an object whose kind says its type
        val e = assertThrows(MismatchedInputException.class, () ->
            factory
                .create(MapperFormat.JSON)
                .readValue("{\"elements\": [[\"system\", {\"id\": \"shop\"}]]}", Application.class)
        );
        assertTrue(
            e
                .getOriginalMessage()
                .contains(
                    "Cannot deserialize value of type `io.morin.archicode.resource.element.application.ApplicationElement` from Array value"
                ),
            e.getOriginalMessage()
        );
    }

    @Test
    void shouldNotReadAnElementFromAText() {
        val e = assertThrows(MismatchedInputException.class, () ->
            factory.create(MapperFormat.JSON).readValue("{\"elements\": [\"shop\"]}", Application.class)
        );
        assertTrue(
            e
                .getOriginalMessage()
                .startsWith(
                    "Could not resolve subtype of [simple type, class io.morin.archicode.resource.element.application.ApplicationElement]: missing type id property 'kind'"
                ),
            e.getOriginalMessage()
        );
    }

    @Test
    void shouldReadTheKeyWithNothingAfterItAsAbsent() throws JsonProcessingException {
        val app = factory.create(MapperFormat.YAML).readValue("elements:\n", Application.class);
        assertTrue(app.getElements().isEmpty());
        val skipped = factory
            .create(MapperFormat.YAML)
            .readValue("elements:\n  - \n  - kind: system\n    id: shop\n", Application.class);
        assertEquals(1, skipped.getElements().size(), "an item with no value is left out of the list");
    }

    @Test
    void shouldNotReadANumberAsTheValueOfAnEnum() {
        val e = assertThrows(JsonProcessingException.class, () ->
            factory.create(MapperFormat.JSON).readValue("{\"layer\": 1}", io.morin.archicode.resource.view.View.class)
        );
        assertTrue(
            e
                .getOriginalMessage()
                .startsWith(
                    "Cannot deserialize value of type `io.morin.archicode.resource.view.View$Layer` from number 1"
                ),
            e.getOriginalMessage()
        );
    }
}

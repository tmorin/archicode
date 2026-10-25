package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.cli.GetSchemasQuery;
import io.morin.archicode.resource.plateau.Patch;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * V1 of wave 022: the schema of {@code archicode query schemas manifest} against the classes it is generated from. It is a golden
 * file (any change of a class or of the generator shows in review), the same bytes on every run, a content that is no longer
 * {@code any}, a description of each of the ten kinds, and the keys of every class that does not ignore unknown keys are the
 * keys the Jackson reader knows (the same technique as {@link EditorReadSchemaTest}, and independent of the generator).
 */
class ManifestSchemaTest {

    static final Path GOLDEN = Path.of("src/test/resources/schemas/manifest.schema.json");

    private static final ObjectMapper JSON = new ObjectMapper();

    @SneakyThrows
    private static String generate() {
        val factory = new MapperFactory();
        val writer = GetSchemasQuery.sortedWriter(factory);
        return writer.writeValueAsString(ManifestSchema.generate(factory.create(MapperFormat.JSON), writer));
    }

    @SneakyThrows
    private static JsonNode schema() {
        return JSON.readTree(generate());
    }

    @Test
    @SneakyThrows
    void shouldBeTheGoldenFile() {
        assertEquals(
            Files.readString(GOLDEN).strip(),
            generate().strip(),
            "the schema changed: if the change is wanted, regenerate " +
                GOLDEN +
                " with `archicode query schemas manifest > " +
                GOLDEN +
                "` and review the diff"
        );
    }

    @Test
    void shouldBeTheSameBytesEveryTime() {
        val first = generate();
        for (int i = 0; i < 5; i++) {
            assertEquals(first, generate());
        }
    }

    @Test
    void shouldDescribeTheContentOfEveryKind() {
        val schema = schema();
        assertEquals("object", schema.at("/properties/content/type").asText(), "content is no longer `any`");
        val expected = new TreeSet<String>();
        for (val kind : ManifestKind.values()) {
            expected.add(kind.getId());
        }
        val actual = new TreeSet<String>();
        schema.get("kinds").fieldNames().forEachRemaining(actual::add);
        assertEquals(expected, actual);
        for (val kind : ManifestKind.values()) {
            val content = schema.at("/kinds/" + kind.getId().replace("/", "~1") + "/content");
            assertEquals("object", content.get("type").asText(), kind.getId());
            assertTrue(content.get("properties").has("id"), kind.getId() + " has an id");
            assertTrue(content.get("properties").get("id").get("required").asBoolean(), kind.getId() + " needs its id");
        }
    }

    @Test
    void shouldPointOnlyAtNestedKindsThatItDescribes() {
        val schema = schema();
        val pointers = new ArrayList<String>();
        collect(schema, pointers);
        assertFalse(pointers.isEmpty(), "a parent points at the kinds it holds");
        for (val pointer : pointers) {
            assertTrue(pointer.startsWith("#/nested/"), pointer);
            assertFalse(schema.at(pointer.substring(1)).isMissingNode(), pointer + " is in the schema");
        }
    }

    private static void collect(JsonNode node, List<String> into) {
        if (node.has("$ref")) {
            into.add(node.get("$ref").asText());
        }
        node.forEach(child -> collect(child, into));
    }

    /** The keys the reader knows for a class that refuses unknown keys. */
    @SneakyThrows
    private static Set<String> known(Class<?> type, String kind) {
        val mapper = new MapperFactory().create(MapperFormat.JSON);
        val json = new java.util.LinkedHashMap<String, Object>();
        if (kind != null) {
            json.put("kind", kind);
        }
        json.put("zzz", 1);
        try {
            mapper.readValue(mapper.writeValueAsString(json), type);
            return fail(type + " reads an unknown key");
        } catch (UnrecognizedPropertyException e) {
            val out = new TreeSet<String>();
            e.getKnownPropertyIds().forEach(id -> out.add(String.valueOf(id)));
            out.removeIf(id -> id.startsWith("$") || "kind".equals(id));
            return out;
        }
    }

    private static Set<String> keys(JsonNode object) {
        val out = new TreeSet<String>();
        object.get("properties").fieldNames().forEachRemaining(out::add);
        out.remove("kind");
        return out;
    }

    @Test
    void shouldHaveTheKeysTheReaderKnows() {
        val schema = schema();
        for (val kind : ManifestKind.values()) {
            val content = schema.at("/kinds/" + kind.getId().replace("/", "~1") + "/content");
            if (content.has("additionalProperties")) {
                // `kind` is added by the loader; a plateau ignores it
                assertEquals(known(kind.getType(), kind.getSubTypeName()), keys(content), kind.getId());
            }
        }
        // the objects inside: a relationship, a patch and what it finds by, a step is lenient and compared with the editor's table
        val relationship = schema.at("/kinds/archicode.morin.io~1person/content/properties/relationships/items");
        val singular = known(io.morin.archicode.resource.element.application.Relationship.class, null);
        val spelled = keys(relationship);
        // `qualifier` is the singular spelling of the builder (a single text); the schema, written from the getters, leaves it out on purpose
        assertEquals(new TreeSet<>(List.of("qualifier")), difference(singular, spelled));
        assertTrue(difference(spelled, singular).isEmpty(), "the schema has a key the reader does not know");
        val patch = schema.at("/kinds/archicode.morin.io~1plateau/content/properties/patches/items");
        assertEquals(known(Patch.class, null), keys(patch));
        assertEquals(
            "json_path",
            patch.at("/properties/json-path/aliases/0").asText(),
            "the other spelling of the key"
        );
        assertEquals(known(Patch.Where.class, null), keys(patch.at("/properties/where")));
    }

    private static Set<String> difference(Set<String> a, Set<String> b) {
        val out = new TreeSet<>(a);
        out.removeAll(b);
        return out;
    }

    @Test
    void shouldSayWhatTheClassesMarkAsReferencesAndIdentifiers() {
        val schema = schema();
        val element = schema.at("/kinds/archicode.morin.io~1system/content/properties");
        assertEquals("^[^.]+$", element.at("/id/pattern").asText());
        assertEquals("^[^.]+(\\.[^.]+)*$", element.at("/relationships/items/properties/destination/pattern").asText());
        assertEquals("^[^.]+(\\.[^.]+)*$", element.at("/replaces/items/pattern").asText());
        val plateau = schema.at("/kinds/archicode.morin.io~1plateau/content/properties");
        assertEquals("^[a-z0-9_-]+$", plateau.at("/id/pattern").asText());
        assertEquals("^[a-z0-9_-]+$", plateau.at("/override/pattern").asText());
        assertEquals("^[a-z0-9_-]+$", schema.at("/properties/header/properties/plateau/pattern").asText());
        assertEquals("^[^.]+(\\.[^.]+)*$", schema.at("/properties/header/properties/parent/pattern").asText());
        assertNotEquals(
            "",
            schema
                .at("/kinds/archicode.morin.io~1story/content/properties/steps/items/properties/at/description")
                .asText()
        );
    }
}

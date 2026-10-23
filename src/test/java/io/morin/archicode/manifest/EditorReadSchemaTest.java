package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Component;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.ContainerElement;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.application.Person;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.element.application.SolutionElement;
import io.morin.archicode.resource.element.application.SystemElement;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.EnvironmentElement;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.NodeElement;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.element.technology.TechnologyElement;
import io.morin.archicode.resource.plateau.Patch;
import io.morin.archicode.resource.plateau.Plateau;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.resource.workspace.Workspace;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The table that the editor reads manifests and {@code .archicode.yaml} with ({@code READ_SCHEMA} in {@code standalone.html}, run
 * 0072) is the table of the classes the command line reads them with: the keys of each type, the keys a type needs, the other
 * names of a key, the kinds a nested element may have, and the kinds of manifest. The page cannot ask the classes, so this test does,
 * and a class that gains a key fails here until the page knows it.
 */
class EditorReadSchemaTest {

    private static final Path PAGE = Path.of("src/main/resources/editor-webapp/standalone.html");

    private static final ObjectMapper MAPPER = new MapperFactory().create(MapperFormat.YAML);

    private static final Map<String, Class<?>> CLASSES = new LinkedHashMap<>();

    static {
        for (Class<?> c : List.of(
            Person.class,
            Component.class,
            Container.class,
            io.morin.archicode.resource.element.application.System.class,
            Solution.class,
            Environment.class,
            Node.class,
            Plateau.class,
            Patch.class,
            Patch.Where.class,
            Relationship.class,
            Application.class,
            Technology.class,
            Workspace.class,
            Settings.class,
            Settings.Manifests.class,
            Settings.Relationships.class,
            Settings.Views.class,
            Settings.Facets.class,
            Settings.Facets.Facet.class,
            Settings.Facets.Facet.Action.class,
            Styles.class,
            Styles.Style.class,
            Formatters.class,
            Formatters.AtomicFormatter.class,
            Formatters.CompositeFormatter.class,
            Formatters.LinkFormatter.class
        )) {
            CLASSES.put(c.getSimpleName(), c);
        }
    }

    private static final Map<String, Class<?>> INTERFACES = Map.of(
        "ApplicationElement",
        ApplicationElement.class,
        "SystemElement",
        SystemElement.class,
        "ContainerElement",
        ContainerElement.class,
        "SolutionElement",
        SolutionElement.class,
        "TechnologyElement",
        TechnologyElement.class,
        "EnvironmentElement",
        EnvironmentElement.class,
        "NodeElement",
        NodeElement.class
    );

    @SneakyThrows
    private static JsonNode schema() {
        val page = Files.readString(PAGE);
        val begin = page.indexOf("// READ_SCHEMA begin");
        val end = page.indexOf("// READ_SCHEMA end");
        assertTrue(begin > 0 && end > begin, "the page marks its table");
        val literal = page.substring(page.indexOf('{', begin), page.lastIndexOf('}', end) + 1);
        return MAPPER.readTree(literal);
    }

    /** The fields of a type, with what it extends. */
    private static Map<String, String> fields(JsonNode types, String name) {
        val def = types.get(name);
        assertNotNull(def, "the type " + name + " is in the table");
        val out = new LinkedHashMap<String, String>();
        if (def.has("extends")) {
            out.putAll(fields(types, def.get("extends").asText()));
        }
        def.path("fields")
            .fields()
            .forEachRemaining(e -> out.put(e.getKey(), e.getValue().asText()));
        return out;
    }

    private static List<String> required(JsonNode types, String name) {
        val def = types.get(name);
        val out = new ArrayList<String>();
        if (def.has("required")) {
            def.get("required").forEach(r -> out.add(r.asText()));
        } else if (def.has("extends")) {
            out.addAll(required(types, def.get("extends").asText()));
        }
        return out;
    }

    private static Map<String, String> aliases(JsonNode types, String name) {
        val def = types.get(name);
        val out = new LinkedHashMap<String, String>();
        if (def.has("extends")) {
            out.putAll(aliases(types, def.get("extends").asText()));
        }
        def.path("aliases")
            .fields()
            .forEachRemaining(e -> out.put(e.getKey(), e.getValue().asText()));
        return out;
    }

    /** The name of the kind a type has when it is nested, or null for a type that is not an element. */
    private static String kindOf(JsonNode kinds, String type) {
        for (Iterator<Map.Entry<String, JsonNode>> it = kinds.fields(); it.hasNext(); ) {
            val interfaceKinds = it.next().getValue();
            for (Iterator<Map.Entry<String, JsonNode>> k = interfaceKinds.fields(); k.hasNext(); ) {
                val kind = k.next();
                if (kind.getValue().asText().equals(type)) {
                    return kind.getKey();
                }
            }
        }
        return null;
    }

    /** A value a key of this spec takes. */
    private static Object dummy(String spec) {
        if (spec.equals("bool")) {
            return true;
        }
        if (spec.equals("int")) {
            return 1;
        }
        if (spec.startsWith("enum:")) {
            return spec.substring(5).split(",")[0];
        }
        if (spec.equals("texts") || spec.startsWith("[")) {
            return List.of();
        }
        if (spec.equals("text-map") || spec.equals("object-map") || spec.startsWith("{")) {
            return Map.of();
        }
        return "x";
    }

    private static Map<String, Object> minimal(JsonNode kinds, String type) {
        val json = new LinkedHashMap<String, Object>();
        val kind = kindOf(kinds, type);
        if (kind != null) {
            json.put("kind", kind);
        }
        return json;
    }

    @Test
    @SneakyThrows
    void shouldListTheKeysTheClassesTake() {
        val schema = schema();
        val types = schema.get("types");
        val kinds = schema.get("kinds");
        for (val name : CLASSES.keySet()) {
            val type = types.get(name);
            assertNotNull(type, "the table has " + name);
            val json = minimal(kinds, name);
            json.put("zzz", 1);
            try {
                MAPPER.readValue(MAPPER.writeValueAsString(json), CLASSES.get(name));
                fail(name + " takes the key zzz");
            } catch (UnrecognizedPropertyException e) {
                val known = e
                    .getKnownPropertyIds()
                    .stream()
                    .map(String::valueOf)
                    .filter(k -> !k.startsWith("$") && !k.equals("kind"))
                    .collect(Collectors.toCollection(TreeSet::new));
                assertEquals(known, new TreeSet<>(fields(types, name).keySet()), "the keys of " + name);
            }
        }
        // every type of the table is read from a class here, but the ones that are lenient (a view, a story: unknown keys are ignored) and the base
        for (val name : names(types)) {
            assertTrue(
                types.get(name).path("lenient").asBoolean(false) || name.equals("Element") || CLASSES.containsKey(name),
                name + " is a type of the table that this test does not read from a class"
            );
        }
    }

    private static List<String> names(JsonNode object) {
        val out = new ArrayList<String>();
        object.fieldNames().forEachRemaining(out::add);
        return out;
    }

    @Test
    @SneakyThrows
    void shouldNameTheKeysTheClassesNeed() {
        val schema = schema();
        val types = schema.get("types");
        val kinds = schema.get("kinds");
        for (val name : CLASSES.keySet()) {
            val fields = fields(types, name);
            val json = minimal(kinds, name);
            val order = new ArrayList<String>();
            val aliasOf = aliases(types, name);
            for (int round = 0; round < 6; round++) {
                try {
                    MAPPER.readValue(MAPPER.writeValueAsString(json), CLASSES.get(name));
                    break;
                } catch (JsonMappingException e) {
                    val m = Pattern.compile("(\\w+) is marked non-null but is null").matcher(e.getOriginalMessage());
                    if (!m.find()) {
                        throw e;
                    }
                    // the sentence says the key as the manual writes it (`json-path`), the field is named `jsonPath`
                    val key = ManifestParser.documented(m.group(1));
                    order.add(key);
                    json.put(key, dummy(fields.get(key)));
                }
            }
            assertEquals(required(types, name), order, "the keys " + name + " needs, in the order it checks them");
            // every other name of a key reads as the key
            for (val alias : aliasOf.entrySet()) {
                val withAlias = new LinkedHashMap<>(json);
                withAlias.remove(alias.getValue());
                withAlias.put(alias.getKey(), dummy(fields.get(alias.getValue())));
                MAPPER.readValue(MAPPER.writeValueAsString(withAlias), CLASSES.get(name));
            }
        }
    }

    @Test
    void shouldListTheKindsANestedElementMayHave() {
        val schema = schema();
        val kinds = schema.get("kinds");
        assertEquals(new TreeSet<>(INTERFACES.keySet()), new TreeSet<>(names(kinds)));
        for (val entry : INTERFACES.entrySet()) {
            val expected = new TreeMap<String, String>();
            for (val sub : entry.getValue().getAnnotation(JsonSubTypes.class).value()) {
                expected.put(sub.name(), sub.value().getSimpleName());
            }
            val actual = new TreeMap<String, String>();
            kinds
                .get(entry.getKey())
                .fields()
                .forEachRemaining(e -> actual.put(e.getKey(), e.getValue().asText()));
            assertEquals(expected, actual, "the kinds of " + entry.getKey());
        }
    }

    /**
     * Which kind a parent holds (issue #87): the command line reads it from the classes ({@code Parent#elementType()}, {@code Nesting}), the
     * page from the {@code elements} of each type of its table and the kinds of that interface. They are the same.
     */
    @Test
    @SneakyThrows
    void shouldNameWhatEachParentHolds() {
        val schema = schema();
        val types = schema.get("types");
        val kinds = schema.get("kinds");
        for (val entry : CLASSES.entrySet()) {
            val fields = fields(types, entry.getKey());
            val holds = fields.containsKey("elements");
            assertEquals(
                holds,
                Parent.class.isAssignableFrom(entry.getValue()),
                entry.getKey() + " has `elements` in the table if and only if it is a parent"
            );
            if (holds) {
                val json = minimal(kinds, entry.getKey());
                if (fields.containsKey("id")) {
                    json.put("id", "x");
                }
                val parent = (Parent<?>) MAPPER.readValue(MAPPER.writeValueAsString(json), entry.getValue());
                assertEquals("[*" + parent.elementType().getSimpleName() + "]", fields.get("elements"), entry.getKey());
            }
        }
    }

    @Test
    void shouldListTheKindsOfManifest() {
        val kinds = schema().get("manifestKinds");
        val expected = Arrays.stream(ManifestKind.values())
            .map(k -> k.getId().substring("archicode.morin.io/".length()))
            .collect(Collectors.toCollection(TreeSet::new));
        assertEquals(expected, new TreeSet<>(names(kinds)));
    }

    /**
     * The schema that {@code archicode query schemas manifest} prints says what the editor's table says (wave 022, V2): the classes,
     * the page and the schema agree three ways, since the first two are compared above. The keys, the required keys, the enums, the
     * shapes of the values, the unknown keys that are ignored, the kinds each kind holds and the kinds held at the top.
     * <p>
     * One difference is known and on purpose: the table lists {@code qualifier} on a relationship, the singular spelling that the
     * builder of the class adds for {@code qualifiers} (a single text); a getter-based schema does not have it.
     */
    @Test
    void shouldSayWhatTheEditorTableSays() {
        val table = schema();
        val types = table.get("types");
        val kinds = table.get("kinds");
        val manifest = manifestSchema();
        val diffs = new ArrayList<String>();

        val expectedKinds = new TreeSet<String>();
        names(table.get("manifestKinds")).forEach(k -> expectedKinds.add("archicode.morin.io/" + k));
        assertEquals(expectedKinds, new TreeSet<>(names(manifest.get("kinds"))), "the kinds of manifest");
        assertEquals(
            expectedKinds,
            new TreeSet<String>(
                ((List<JsonNode>) toList(manifest.at("/properties/header/properties/kind/enum")))
                    .stream()
                    .map(JsonNode::asText)
                    .toList()
            ),
            "header.kind"
        );

        val topLevel = new TreeSet<String>();
        topLevel.addAll(names(kinds.get("ApplicationElement")));
        topLevel.addAll(names(kinds.get("TechnologyElement")));
        for (val entry : table.get("manifestKinds").properties()) {
            val kind = entry.getKey();
            val type = entry.getValue().asText();
            val schemaKind = manifest.get("kinds").get("archicode.morin.io/" + kind);
            assertNotNull(schemaKind, kind);
            assertEquals(kind, schemaKind.get("kind").asText());
            compareType(types, kinds, type, schemaKind.get("content"), manifest, kind, diffs);
            val elements = fields(types, type).get("elements");
            if (!type.equals("View") && !type.equals("Story") && !type.equals("Plateau")) {
                val iface = elements == null ? null : elements.substring(2, elements.length() - 1);
                val held = iface == null ? new TreeSet<String>() : new TreeSet<>(names(kinds.get(iface)));
                assertEquals(
                    held,
                    new TreeSet<>(toList(schemaKind.get("holds")).stream().map(JsonNode::asText).toList()),
                    kind + " holds"
                );
                assertEquals(
                    topLevel.contains(kind),
                    schemaKind.get("heldAtTheTop").asBoolean(),
                    kind + " held at the top"
                );
                val nested = manifest.get("nested").get(kind);
                assertNotNull(nested, "nested " + kind);
                assertEquals(
                    List.of(kind),
                    toList(nested.at("/properties/kind/enum")).stream().map(JsonNode::asText).toList()
                );
                assertTrue(nested.at("/properties/kind/required").asBoolean(), "nested " + kind + " needs its kind");
            } else {
                assertFalse(schemaKind.has("holds"), kind + " is no element");
            }
        }
        assertEquals(
            new TreeSet<>(names(table.get("manifestKinds")))
                .stream()
                .filter(k -> kindOf(kinds, readTypeOf(table, k)) != null)
                .toList(),
            new TreeSet<>(names(manifest.get("nested"))).stream().toList(),
            "the nested forms are the kinds an element can have"
        );
        assertEquals(List.of(), diffs);
    }

    private static String readTypeOf(JsonNode table, String kind) {
        return table.get("manifestKinds").get(kind).asText();
    }

    private static List<JsonNode> toList(JsonNode array) {
        val out = new ArrayList<JsonNode>();
        array.forEach(out::add);
        return out;
    }

    @SneakyThrows
    private static JsonNode manifestSchema() {
        val factory = new MapperFactory();
        val writer = io.morin.archicode.cli.GetSchemasQuery.sortedWriter(factory);
        return MAPPER_JSON.readTree(
            writer.writeValueAsString(ManifestSchema.generate(factory.create(MapperFormat.JSON), writer))
        );
    }

    private static final ObjectMapper MAPPER_JSON = new ObjectMapper();

    /** One type of the table against the schema of an object; {@code diffs} gets a sentence for each difference. */
    private static void compareType(
        JsonNode types,
        JsonNode kinds,
        String type,
        JsonNode schema,
        JsonNode root,
        String where,
        List<String> diffs
    ) {
        val expected = fields(types, type);
        val properties = schema.path("properties");
        val actual = new TreeSet<>(names(properties));
        actual.remove("kind");
        val aliases = aliases(types, type);
        val expectedKeys = new TreeSet<>(expected.keySet());
        expectedKeys.removeAll(aliases.keySet()); // another name of a key is not a key of the schema: it is an alias of one
        if (type.equals("Relationship")) {
            expectedKeys.remove("qualifier"); // known difference, see above
        }
        if (!expectedKeys.equals(actual)) {
            diffs.add(
                where + " (" + type + "): the keys differ, the table has " + expectedKeys + ", the schema " + actual
            );
            return;
        }
        for (val alias : aliases.entrySet()) {
            val listed = toList(properties.path(alias.getValue()).path("aliases"))
                .stream()
                .map(JsonNode::asText)
                .toList();
            if (!listed.contains(alias.getKey())) {
                diffs.add(
                    where + ": " + alias.getValue() + " should list the alias " + alias.getKey() + " in the schema"
                );
            }
        }
        val required = new TreeSet<>(required(types, type));
        val requiredActual = new TreeSet<String>();
        properties.fields().forEachRemaining(e -> {
            if (e.getValue().path("required").asBoolean(false) && !e.getKey().equals("kind")) {
                requiredActual.add(e.getKey());
            }
        });
        if (!required.equals(requiredActual)) {
            diffs.add(
                where +
                    " (" +
                    type +
                    "): the required keys differ, the table has " +
                    required +
                    ", the schema " +
                    requiredActual
            );
        }
        val lenient = types.get(type).path("lenient").asBoolean(false);
        if (lenient == schema.path("additionalProperties").isBoolean()) {
            diffs.add(
                where +
                    " (" +
                    type +
                    "): lenient is " +
                    lenient +
                    " in the table, the schema says " +
                    schema.path("additionalProperties")
            );
        }
        for (val key : expectedKeys) {
            compareSpec(types, kinds, expected.get(key), properties.get(key), root, where + "." + key, diffs);
        }
    }

    private static void compareSpec(
        JsonNode types,
        JsonNode kinds,
        String spec,
        JsonNode schema,
        JsonNode root,
        String where,
        List<String> diffs
    ) {
        if (spec.equals("any")) {
            return;
        }
        if (spec.equals("text")) {
            expectType(schema, "string", where, diffs);
        } else if (spec.equals("int")) {
            expectType(schema, "integer", where, diffs);
        } else if (spec.equals("bool")) {
            expectType(schema, "boolean", where, diffs);
        } else if (spec.equals("texts")) {
            expectType(schema, "array", where, diffs);
            expectType(schema.path("items"), "string", where + "[]", diffs);
        } else if (spec.equals("text-map")) {
            expectType(schema, "object", where, diffs);
            expectType(schema.path("additionalProperties"), "string", where + "{}", diffs);
        } else if (spec.equals("object-map")) {
            expectType(schema, "object", where, diffs);
            if (!schema.path("additionalProperties").isObject()) {
                diffs.add(where + ": a map of objects");
            }
        } else if (spec.startsWith("enum:")) {
            val expected = new TreeSet<>(Arrays.asList(spec.substring(5).toUpperCase().split(",")));
            val actual = new TreeSet<String>();
            schema.path("enum").forEach(e -> actual.add(e.asText().toUpperCase()));
            if (!expected.equals(actual)) {
                diffs.add(where + ": the enum is " + expected + " in the table, " + actual + " in the schema");
            }
        } else if (spec.startsWith("[*")) {
            val iface = spec.substring(2, spec.length() - 1);
            expectType(schema, "array", where, diffs);
            val expected = new TreeSet<String>();
            names(kinds.get(iface)).forEach(k -> expected.add("#/nested/" + k));
            val actual = new TreeSet<String>();
            schema
                .path("items")
                .path("type")
                .forEach(t -> actual.add(t.path("$ref").asText()));
            if (!expected.equals(actual)) {
                diffs.add(where + ": the nested kinds are " + expected + " in the table, " + actual + " in the schema");
            }
        } else if (spec.startsWith("[")) {
            expectType(schema, "array", where, diffs);
            compareType(
                types,
                kinds,
                spec.substring(1, spec.length() - 1),
                schema.path("items"),
                root,
                where + "[]",
                diffs
            );
        } else if (spec.startsWith("{")) {
            expectType(schema, "object", where, diffs);
            compareType(
                types,
                kinds,
                spec.substring(1, spec.length() - 1),
                schema.path("additionalProperties"),
                root,
                where + "{}",
                diffs
            );
        } else {
            expectType(schema, "object", where, diffs);
            compareType(types, kinds, spec, schema, root, where, diffs);
        }
    }

    private static void expectType(JsonNode schema, String type, String where, List<String> diffs) {
        if (!type.equals(schema.path("type").asText())) {
            diffs.add(where + ": the type is " + type + " in the table, " + schema.path("type") + " in the schema");
        }
    }
}

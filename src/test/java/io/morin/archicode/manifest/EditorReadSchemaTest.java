package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
}

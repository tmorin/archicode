package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.view.View;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

/**
 * The output of {@code query views} and {@code query schemas} is the same from one run to the next and from one build to
 * the next (wave 011, issues #48 and #49): it is sorted, so that whoever diffs it or stores it sees only what changed.
 *
 * <p>What this test cannot vary is the JVM: the identity hash of an enum, which used to order the views, and the order
 * of {@code getDeclaredMethods}, which used to order the properties of the elements, are the same during the whole
 * test. So it fixes the order itself: the views are given in every order to the sort, and the properties of every object
 * of both schemas are checked to be in alphabetical order, whatever the order they were found in.
 */
@QuarkusTest
class SortedQueryOutputTest {

    private static final String WORKSPACE = "src/test/resources/viewpoint-kernel/workspace/workspace.yaml";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    GetSchemasQuery getSchemasQuery;

    private static View view(String id, View.Layer layer, String viewpoint, String name) {
        return View.builder().id(id).layer(layer).viewpoint(viewpoint).name(name).build();
    }

    @Test
    void theViewsAreSortedByIdentifierThenLayerWhateverTheOrderTheyComeIn() {
        val expected = List.of(
            view("a-view", View.Layer.APPLICATION, "deep", null),
            view("a-view", View.Layer.TECHNOLOGY, "deep", null),
            view("b-view", View.Layer.APPLICATION, "deep", "Alpha"),
            view("b-view", View.Layer.APPLICATION, "deep", "Beta"),
            view("b-view", View.Layer.APPLICATION, "flow", null),
            view("b-view", View.Layer.TECHNOLOGY, "deep", null),
            view("c-view", View.Layer.APPLICATION, "flow", null),
            view("c-view", View.Layer.TECHNOLOGY, "flow", null)
        );
        val shuffled = new ArrayList<>(expected);
        for (var seed = 0; seed < 50; seed++) {
            Collections.shuffle(shuffled, new Random(seed));
            assertEquals(expected, GetViewsQuery.sortViews(shuffled), "seed " + seed);
        }
    }

    private CliHarness.Result queryViews(String format) {
        val result = CliHarness.run(factory, errorOutput, "-w", WORKSPACE, "query", "views", "-f", format);
        assertEquals(0, result.exit(), result.err());
        return result;
    }

    @SneakyThrows
    private List<String> idsAndLayers(String format) {
        val views = mapperFactory.create(MapperFormat.valueOf(format.toUpperCase())).readTree(queryViews(format).out());
        val keys = new ArrayList<String>();
        for (val view : views) {
            keys.add(view.get("id").asText() + "/" + view.get("layer").asText());
        }
        return keys;
    }

    private static List<String> idsAndLayersOfToml(String toml) {
        // the TOML of a list has no table to read it back with: the pairs of `id` and `layer` are in the text
        val keys = new ArrayList<String>();
        val matcher = java.util.regex.Pattern.compile("id = '([^']*)'[^}]*?layer = '([^']*)'").matcher(toml);
        while (matcher.find()) {
            keys.add(matcher.group(1) + "/" + matcher.group(2));
        }
        return keys;
    }

    @Test
    void queryViewsListsTheViewsByIdentifierThenLayerInEveryFormat() {
        val json = idsAndLayers("json");
        assertTrue(json.size() > 10, "the workspace has views of both layers: " + json);
        assertTrue(json.stream().anyMatch(key -> key.endsWith("/application")));
        assertTrue(json.stream().anyMatch(key -> key.endsWith("/technology")));
        assertEquals(json.size(), new TreeSet<>(json).size(), "a view is listed once");

        val expected = new ArrayList<>(json);
        expected.sort(
            Comparator.comparing((String key) -> key.substring(0, key.lastIndexOf('/'))).thenComparing(
                // application comes before technology, as in View.Layer
                key -> key.endsWith("/technology")
            )
        );
        assertEquals(expected, json);
        assertEquals(json, idsAndLayers("yaml"));
        assertEquals(json, idsAndLayersOfToml(queryViews("toml").out()));
    }

    /** Walks a schema: the keys of every {@code properties} map are sorted, and so are those of the schemas below it. */
    private static void assertPropertiesSorted(JsonNode node, String path) {
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                val child = entry.getValue();
                if ("properties".equals(entry.getKey()) && child.isObject()) {
                    // a map from the name of a property to its schema (a property may itself be called `properties`)
                    val names = new ArrayList<String>();
                    child.fieldNames().forEachRemaining(names::add);
                    val sorted = new ArrayList<>(names);
                    Collections.sort(sorted);
                    assertEquals(sorted, names, "the properties of " + path);
                    child
                        .fields()
                        .forEachRemaining(property ->
                            assertPropertiesSorted(property.getValue(), path + "/" + property.getKey())
                        );
                } else {
                    assertPropertiesSorted(child, path + "/" + entry.getKey());
                }
            });
        } else if (node.isArray()) {
            for (var i = 0; i < node.size(); i++) {
                assertPropertiesSorted(node.get(i), path + "/" + i);
            }
        }
    }

    @SneakyThrows
    @Test
    void theSchemasListThePropertiesOfEveryObjectInAlphabeticalOrder() {
        val writer = GetSchemasQuery.sortedWriter(mapperFactory);
        var objects = 0;
        for (val type : GetSchemasQuery.SchemaType.values()) {
            val schema = mapperFactory
                .create(MapperFormat.JSON)
                .readTree(writer.writeValueAsString(getSchemasQuery.generateSchema(type, writer)));
            assertPropertiesSorted(schema, type.name());
            objects += schema.toString().split("\"properties\"", -1).length - 1;
        }
        assertTrue(objects > 20, "many objects were checked: " + objects);
    }

    @Test
    void theSchemaOfTheCommandIsTheSameEveryTimeItIsGenerated() {
        val first = CliHarness.run(factory, errorOutput, "query", "schemas", "workspace");
        val second = CliHarness.run(factory, errorOutput, "query", "schemas", "workspace");
        assertEquals(0, first.exit(), first.err());
        assertFalse(first.out().isBlank());
        assertEquals(first.out(), second.out());
        // `description` comes before `name` in the elements, as it does alphabetically
        assertTrue(first.out().indexOf("\"description\"") < first.out().indexOf("\"name\""));
    }
}

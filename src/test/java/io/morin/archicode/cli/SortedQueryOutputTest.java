package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
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

    private static final String WORKSPACE = "src/test/resources/viewpoint-kernel/workspace/.archicode.yaml";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    GetSchemasQuery getSchemasQuery;

    @Inject
    WorkspaceFactory workspaceFactory;

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
        val views = mapperFactory
            .create(MapperFormat.valueOf(format.toUpperCase(Locale.ROOT)))
            .readTree(queryViews(format).out());
        val keys = new ArrayList<String>();
        for (val view : views) {
            keys.add(view.get("id").asText() + "/" + view.get("layer").asText());
        }
        return keys;
    }

    @SneakyThrows
    private List<String> idsAndLayersOfToml(String toml) {
        // the TOML of the command is a table: `views` holds the list, read back by a TOML parser
        val document = mapperFactory.create(MapperFormat.TOML).readTree(toml);
        assertEquals(List.of("views"), fieldNames(document), "the document is one table, with the list under `views`");
        val keys = new ArrayList<String>();
        for (val view : document.get("views")) {
            keys.add(view.get("id").asText() + "/" + view.get("layer").asText());
        }
        return keys;
    }

    private static List<String> fieldNames(JsonNode node) {
        val names = new ArrayList<String>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
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

    @SneakyThrows
    @Test
    void theTomlOfQueryViewsHoldsTheSameViewsAsTheJsonOnceParsed() {
        val json = mapperFactory.create(MapperFormat.JSON).readTree(queryViews("json").out());
        val toml = mapperFactory.create(MapperFormat.TOML).readTree(queryViews("toml").out());
        assertEquals(List.of("views"), fieldNames(toml));
        assertEquals(json, toml.get("views"));
    }

    @SneakyThrows
    @Test
    void aQueryThatSelectsOneViewIsATableInTomlAndAListIsHeldUnderViews() {
        val toml = mapperFactory.create(MapperFormat.TOML);
        val one = CliHarness.run(factory, errorOutput, "-w", WORKSPACE, "query", "views", "-f", "toml", "-q", "$.[0]");
        assertEquals(0, one.exit(), one.err());
        val oneView = toml.readTree(one.out());
        assertTrue(oneView.has("id") && oneView.has("layer"), "a single view is a table already: " + one.out());

        val several = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            WORKSPACE,
            "query",
            "views",
            "-f",
            "toml",
            "-q",
            "$.[?(@.layer=='technology')]"
        );
        assertEquals(0, several.exit(), several.err());
        val views = toml.readTree(several.out()).get("views");
        assertTrue(views.size() > 1 && views.size() < queryViewsCount());
        for (val view : views) {
            assertEquals("technology", view.get("layer").asText());
        }

        val ids = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            WORKSPACE,
            "query",
            "views",
            "-f",
            "toml",
            "-q",
            "$.[*].id"
        );
        assertEquals(0, ids.exit(), ids.err());
        assertEquals(queryViewsCount(), toml.readTree(ids.out()).get("views").size());
    }

    @SneakyThrows
    private int queryViewsCount() {
        return mapperFactory.create(MapperFormat.JSON).readTree(queryViews("json").out()).size();
    }

    private static final String GRAPH_WORKSPACE = """
    application:
      elements:
        - kind: solution
          id: warehouse
          elements:
            - kind: system
              id: scanner
              relationships:
                - destination: shop.api
                  label: reports to
        - kind: solution
          id: shop
          elements:
            - kind: system
              id: web
              relationships:
                - destination: shop.catalog
                  label: reads
                - destination: shop.api
                  label: calls
                - destination: shop.billing
                  label: charges
            - kind: system
              id: mailer
            - kind: system
              id: catalog
            - kind: system
              id: billing
            - kind: system
              id: api
        - kind: solution
          id: audit
    technology:
      elements:
        - kind: environment
          id: prod
          elements:
            - kind: node
              id: vm_b
              relationships:
                - destination: prod.vm_a
                  label: replicates to
            - kind: node
              id: vm_a
            - kind: node
              id: db
        - kind: environment
          id: edge
          elements:
            - kind: node
              id: proxy
              relationships:
                - destination: prod.db
                  label: reaches
                - destination: prod.vm_b
                  label: forwards to
    """;

    @SneakyThrows
    private static List<String> references(JsonNode graph, String layer) {
        val references = new ArrayList<String>();
        for (val entry : graph.get("elements")) {
            if (layer.equals(entry.get("layer").asText())) {
                references.add(entry.get("reference").asText());
            }
        }
        return references;
    }

    @SneakyThrows
    @Test
    void queryGraphListsTheElementsByLayerThenReferenceAndTheRelationshipsBySourceThenAsWritten(@TempDir Path folder) {
        val workspaceFile = folder.resolve(".archicode.yaml");
        Files.writeString(workspaceFile, GRAPH_WORKSPACE);

        // the input is one whose hash order is not the sorted order: the test would pass by chance otherwise
        val workspace = workspaceFactory.create(workspaceFile.toAbsolutePath(), null, null);
        val hashOrder = List.copyOf(workspace.appIndex.listAllElementReferences(element -> true));
        assertNotEquals(new ArrayList<>(new TreeSet<>(hashOrder)), hashOrder, "hash order of the application");
        val technologyHashOrder = List.copyOf(workspace.techIndex.listAllElementReferences(element -> true));
        assertNotEquals(
            new ArrayList<>(new TreeSet<>(technologyHashOrder)),
            technologyHashOrder,
            "hash order of the technology"
        );

        val result = CliHarness.run(factory, errorOutput, "-w", workspaceFile.toString(), "query", "graph");
        assertEquals(0, result.exit(), result.err());
        val graph = mapperFactory.create(MapperFormat.JSON).readTree(result.out());

        assertEquals(
            List.of(
                "audit",
                "shop",
                "shop.api",
                "shop.billing",
                "shop.catalog",
                "shop.mailer",
                "shop.web",
                "warehouse",
                "warehouse.scanner"
            ),
            references(graph, "application")
        );
        assertEquals(
            List.of("edge", "edge.proxy", "prod", "prod.db", "prod.vm_a", "prod.vm_b"),
            references(graph, "technology")
        );
        // the layers come one after the other, the application first
        val layers = new ArrayList<String>();
        graph.get("elements").forEach(entry -> layers.add(entry.get("layer").asText()));
        assertEquals(
            Stream.concat(
                Collections.nCopies(9, "application").stream(),
                Collections.nCopies(6, "technology").stream()
            ).toList(),
            layers
        );

        // by source, then, for one source, as the author wrote them (catalog, api, billing: not alphabetical)
        val relationships = new ArrayList<String>();
        for (val entry : graph.get("relationships")) {
            relationships.add(
                entry.get("layer").asText() +
                    ":" +
                    entry.get("source").asText() +
                    "->" +
                    entry.get("relationship").get("destination").asText()
            );
        }
        assertEquals(
            List.of(
                "application:shop.web->shop.catalog",
                "application:shop.web->shop.api",
                "application:shop.web->shop.billing",
                "application:warehouse.scanner->shop.api",
                "technology:edge.proxy->prod.db",
                "technology:edge.proxy->prod.vm_b",
                "technology:prod.vm_b->prod.vm_a"
            ),
            relationships
        );

        // and it is one text, whatever the number of times it is asked for
        for (var run = 0; run < 5; run++) {
            assertEquals(
                result.out(),
                CliHarness.run(factory, errorOutput, "-w", workspaceFile.toString(), "query", "graph").out()
            );
        }
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

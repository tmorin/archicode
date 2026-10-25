package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The map of the technology layer (wave 015, run 0099, issue #92): the command line draws a view of {@code layer: technology} and
 * {@code viewpoint: map}, as the page Environments of the editor does, the boxes and the links being the same on the example the
 * manual ships ({@code expected-boxes.json}, which {@code technology-map-shared.test.js} reads too). The map of the application layer is
 * drawn the same way.
 */
@QuarkusTest
class TechnologyMapTest {

    private static final Path CONTRACT = Path.of("src/test/resources/technology-map/expected-boxes.json");
    private static final Path LAYERED = Path.of("src/test/resources/brightcart/layered");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpoints;

    @TempDir
    Path dir;

    private CliHarness.Result run(String... args) {
        return CliHarness.run(factory, errorOutput, args);
    }

    private static List<String> boxes(Iterable<Item> items) {
        val out = new ArrayList<String>();
        for (val item : items) {
            out.add(item.getItemId());
            out.addAll(boxes(item.getChildren()));
        }
        return out.stream().sorted().toList();
    }

    @SneakyThrows
    private static void copy(Path from, Path to) {
        try (val files = Files.walk(from)) {
            for (val file : files.toList()) {
                val target = to.resolve(from.relativize(file).toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(file, target);
                }
            }
        }
    }

    /** The boxes and the links of a view drawn with the properties it names put over its own. */
    private void assertDrawn(Workspace workspace, View view, JsonNode properties, JsonNode expected, String name) {
        val merged =
            view.getProperties() == null
                ? new ObjectMapper().createObjectNode()
                : (ObjectNode) view.getProperties().deepCopy();
        if (properties != null) {
            merged.setAll((ObjectNode) properties);
        }
        val drawn = viewpoints
            .get("map")
            .createViewpointFactory()
            .create(workspace, view.toBuilder().properties(merged).build());
        assertEquals(strings(expected.path("boxes")), boxes(drawn.getItems()), name + ": boxes");
        val links = drawn
            .getLinks()
            .stream()
            .map(link -> link.getFrom().getItemId() + " -> " + link.getTo().getItemId())
            .sorted()
            .toList();
        assertEquals(strings(expected.path("links")), links, name + ": links");
    }

    @Test
    @SneakyThrows
    void shouldDrawTheBoxesAndTheLinksTheEditorDrawsForTheSavedMapsOfTheExampleAndOfTheBrightcart() {
        val contract = new ObjectMapper().readTree(CONTRACT.toFile());
        var checked = 0;
        var variants = 0;
        for (val entry : contract.path("workspaces")) {
            val path = Path.of(entry.path("workspace").asText(), ".archicode.yaml");
            for (val view : entry.path("views").properties()) {
                val plateau = view.getValue().path("plateau").asText(null);
                val workspace = workspaceFactory.create(path, null, plateau);
                val saved = workspace.viewIndex.searchView(view.getKey()).orElseThrow();
                assertEquals("map", saved.getViewpoint());
                assertEquals("TECHNOLOGY", saved.getLayer().name());
                assertDrawn(workspace, saved, null, view.getValue(), view.getKey());
                checked++;
                for (val variant : view.getValue().path("variants").properties()) {
                    assertDrawn(
                        workspace,
                        saved,
                        variant.getValue().path("properties"),
                        variant.getValue(),
                        view.getKey() + " " + variant.getKey()
                    );
                    variants++;
                }
            }
        }
        assertEquals(5, checked);
        assertEquals(9, variants);
    }

    private static List<String> strings(JsonNode list) {
        val out = new ArrayList<String>();
        list.forEach(node -> out.add(node.asText()));
        return out.stream().sorted(Comparator.naturalOrder()).toList();
    }

    @Test
    @SneakyThrows
    void shouldGenerateTheViewsOfTheExampleLikeAnyOtherViewWhenTheyAreAskedFor() {
        copy(Path.of("src/doc/examples/domain_technology_map"), dir);
        val result = run(
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "-i",
            "datacentre-map",
            "-i",
            "datacentre-map-open",
            "-i",
            "datacentre-map-database"
        );
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err(), "nothing is skipped: the command line draws the map");
        val folder = dir.resolve("views/plantuml/technology");
        val open = Files.readString(folder.resolve("datacentre-map-open.puml"));
        assertTrue(open.contains("rectangle datacentre.rack.db <<node>>"), open);
        assertTrue(open.contains("datacentre.rack.db --> backup : ships snapshots to"), open);
        val database = Files.readString(folder.resolve("datacentre-map-database.puml"));
        assertTrue(!database.contains("datacentre.edge"), "the edge is hidden: " + database);
    }

    /** A saved map of the technology layer of the layered Brightcart, opened down to the batch node and to the nodes of the partners it reaches. */
    @SneakyThrows
    private void writeOpenMap(String id, String parts) {
        Files.writeString(
            dir.resolve("baseline/view." + id + ".yaml"),
            """
            header:
              kind: "archicode.morin.io/view"
              version: "1"
            content:
              id: "%s"
              viewpoint: "map"
              layer: "technology"
              properties:
                opened: ["prod", "prod.dc", "prod.dc.batch-vm", "partners", "partners.carrier-live"]
            %s
            """.formatted(id, parts)
        );
    }

    @Test
    @SneakyThrows
    void shouldDrawTheApplicationsAndTheDependenciesOfTheTechnologyMapAndLeaveThemOutOnRequest() {
        copy(LAYERED, dir);
        writeOpenMap("tm_both", "");
        writeOpenMap("tm_nodes", "    applications: false");
        writeOpenMap("tm_unlinked", "    relationships: false");
        writeOpenMap("tm_neither", "    applications: false\n    relationships: false");
        val result = run(
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "--plateau",
            "baseline",
            "-i",
            "tm_both",
            "-i",
            "tm_nodes",
            "-i",
            "tm_unlinked",
            "-i",
            "tm_neither"
        );
        assertEquals(0, result.exit(), result.err());
        val folder = dir.resolve("views-baseline/plantuml/technology");
        val both = Files.readString(folder.resolve("tm_both.puml"));
        assertTrue(both.contains("rectangle batch_vm_fulfilment_sync"), both);
        assertTrue(both.contains("batch_vm_fulfilment_sync --> carrier_live_carrier"), both);
        val nodes = Files.readString(folder.resolve("tm_nodes.puml"));
        assertTrue(!nodes.contains("fulfilment_sync"), nodes);
        assertTrue(nodes.contains("prod.dc.batch_vm --> partners.carrier_live"), nodes);
        val unlinked = Files.readString(folder.resolve("tm_unlinked.puml"));
        assertTrue(unlinked.contains("rectangle batch_vm_fulfilment_sync"), unlinked);
        assertTrue(!unlinked.contains("-->"), unlinked);
        val neither = Files.readString(folder.resolve("tm_neither.puml"));
        assertTrue(!neither.contains("fulfilment_sync") && !neither.contains("-->"), neither);
    }

    @Test
    @SneakyThrows
    void shouldDrawTheMapOfTheApplicationLayerToo() {
        Files.writeString(
            dir.resolve(".archicode.yaml"),
            """
            application:
              elements:
                - kind: "solution"
                  id: "sol_a"
                  elements:
                    - kind: "system"
                      id: "sys_aa"
                      relationships:
                        - destination: "sol_b.sys_bb"
                          label: "calls"
                - kind: "solution"
                  id: "sol_b"
                  elements:
                    - kind: "system"
                      id: "sys_bb"
            views:
              - id: "apps"
                viewpoint: "map"
                layer: "application"
                properties:
                  opened:
                    - "sol_a"
                    - "sol_b"
            """
        );
        val result = run("-w", dir.resolve(".archicode.yaml").toString(), "views", "generate", "-i", "apps");
        assertEquals(0, result.exit(), result.err());
        val puml = Files.readString(dir.resolve("views/plantuml/application/apps.puml"));
        assertTrue(puml.contains("sol_a.sys_aa --> sol_b.sys_bb : calls"), puml);
    }

    @Test
    @SneakyThrows
    void shouldDrawTheStatesOfAComparisonOnTheBoxes() {
        copy(LAYERED, dir);
        Files.writeString(
            dir.resolve("baseline/view.tech_map.yaml"),
            """
            header:
              kind: "archicode.morin.io/view"
              version: "1"
            content:
              id: "tech_map"
              name: "The environments"
              viewpoint: "map"
              layer: "technology"
              properties:
                opened:
                  - "prod"
                  - "prod.dc"
            """
        );
        val result = run(
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "--plateau",
            "inhouse",
            "--against",
            "baseline",
            "-i",
            "tech_map"
        );
        assertEquals(0, result.exit(), result.err());
        val puml = Files.readString(dir.resolve("views-inhouse-vs-baseline/plantuml/technology/tech_map.puml"));
        assertTrue(puml.contains("rectangle prod.cloud <<new>> <<node>>"), puml);
        assertTrue(puml.contains("rectangle prod.dc.cache_vm <<removed>> <<node>>"), puml);
        assertTrue(puml.contains("<<contains-changes>> <<composite>>"), puml);
    }

    @Test
    @SneakyThrows
    void shouldTellAMapThatCannotBeDrawnInOneLine() {
        copy(Path.of("src/doc/examples/domain_technology_map"), dir);
        val workspace = dir.resolve(".archicode.yaml");
        val source = Files.readString(workspace);
        // pinned on an element that is not there: the kernel names the first it cannot find
        Files.writeString(workspace, source.replace("\"datacentre.rack.db\"", "\"datacentre.rack.nowhere\""));
        var result = run("-w", workspace.toString(), "views", "generate", "-i", "datacentre-map-database");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view datacentre-map-database: dangling reference: datacentre.rack.nowhere",
            result.err().strip()
        );
        // the same for the other lists
        Files.writeString(workspace, source.replace("\"datacentre.edge\"", "\"datacentre.nowhere\""));
        result = run("-w", workspace.toString(), "views", "generate", "-i", "datacentre-map-database");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view datacentre-map-database: dangling reference: datacentre.nowhere",
            result.err().strip()
        );
        // a list that is not a list of references
        Files.writeString(workspace, source.replace("- \"datacentre.edge\"", "- 3"));
        result = run("-w", workspace.toString(), "views", "generate", "-i", "datacentre-map-database");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view datacentre-map-database: `hidden` is a list of references, and 3 is not one",
            result.err().strip()
        );
    }
}

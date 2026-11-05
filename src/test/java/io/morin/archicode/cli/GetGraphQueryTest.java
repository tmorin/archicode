package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GetGraphQueryTest {

    @Inject
    GetGraphQuery getGraphQuery;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    WorkspaceFactory workspaceFactory;

    private ArchiCode archiCodeFor(String workspacePath) {
        val archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of(workspacePath);
        return archiCode;
    }

    private void bind(String workspacePath) {
        val queryGroup = new QueryGroup();
        queryGroup.archiCode = archiCodeFor(workspacePath);
        getGraphQuery.queryGroup = queryGroup;
    }

    @SneakyThrows
    private String printed(String workspacePath) {
        bind(workspacePath);
        val originalOut = System.out;
        val capturedOut = new ByteArrayOutputStream();
        try {
            System.setOut(new PrintStream(capturedOut, true, StandardCharsets.UTF_8));
            assertDoesNotThrow(getGraphQuery::run);
        } finally {
            System.setOut(originalOut);
        }
        return capturedOut.toString(StandardCharsets.UTF_8);
    }

    @SneakyThrows
    private List<String> pairsOf(JsonNode deployments) {
        val pairs = new ArrayList<String>();
        for (val entry : deployments) {
            val names = new ArrayList<String>();
            entry.fieldNames().forEachRemaining(names::add);
            assertEquals(List.of("node", "application"), names, "an entry has exactly node and application");
            pairs.add(entry.get("node").asText() + "->" + entry.get("application").asText());
        }
        return pairs;
    }

    @SneakyThrows
    @Test
    void shouldPrintDeploymentsByNodeThenAsWritten() {
        val tree = mapperFactory
            .create(MapperFormat.JSON)
            .readTree(printed("src/test/workspaces/case_graph_deployments.yaml"));

        val deployments = tree.get("deployments");
        assertTrue(deployments != null && deployments.isArray(), "expected a top-level deployments list");
        assertEquals(
            List.of("env.alpha->sol.sys_a", "env.alpha.inner->sol.sys_b", "env.beta->sol.sys_b", "env.beta->sol.sys_a"),
            pairsOf(deployments)
        );
    }

    @SneakyThrows
    @Test
    void shouldWriteDeploymentsAsTheLastKey() {
        val json = printed("src/test/workspaces/case_graph_deployments.yaml");
        val tree = mapperFactory.create(MapperFormat.JSON).readTree(json);

        val names = new ArrayList<String>();
        tree.fieldNames().forEachRemaining(names::add);
        assertEquals(List.of("elements", "relationships", "deployments"), names);
        assertTrue(json.trim().endsWith("]}"), "the line ends with the deployments list");
    }

    @SneakyThrows
    @Test
    void shouldPrintTheSameBytesTwice() {
        assertEquals(
            printed("src/test/workspaces/case_graph_deployments.yaml"),
            printed("src/test/workspaces/case_graph_deployments.yaml")
        );
    }

    @SneakyThrows
    @Test
    void shouldNotWriteDeploymentsWhenNothingIsDeployed() {
        val json = printed("src/test/workspaces/case_graph_ok.yaml");
        val tree = mapperFactory.create(MapperFormat.JSON).readTree(json);

        assertFalse(tree.has("deployments"));
        assertFalse(json.contains("deployments"));
    }

    @SneakyThrows
    @Test
    void shouldCopyADanglingHostedApplicationWhenThereIsNoPlateau() {
        val tree = mapperFactory
            .create(MapperFormat.JSON)
            .readTree(printed("src/test/workspaces/case_graph_deployments_dangling.yaml"));

        val deployments = tree.get("deployments");
        assertTrue(deployments != null, "expected the deployments key");
        assertEquals(List.of("env.node_a->sol.sys_missing"), pairsOf(deployments));
    }

    @SneakyThrows
    @Test
    void shouldPrintValidJsonForEveryElementAndRelationship() {
        bind("src/test/workspaces/case_graph_ok.yaml");

        val originalOut = System.out;
        val capturedOut = new ByteArrayOutputStream();
        try {
            System.setOut(new PrintStream(capturedOut, true, StandardCharsets.UTF_8));
            assertDoesNotThrow(getGraphQuery::run);
        } finally {
            System.setOut(originalOut);
        }

        val json = capturedOut.toString(StandardCharsets.UTF_8);
        val tree = mapperFactory.create(MapperFormat.JSON).readTree(json);

        val elements = (JsonNode) tree.get("elements");
        val relationships = (JsonNode) tree.get("relationships");
        assertTrue(
            elements.isArray() && elements.size() >= 4,
            "expected at least 4 indexed elements across both layers"
        );
        assertTrue(
            relationships.isArray() && relationships.size() == 2,
            "expected exactly the 2 relationships declared in the fixture (one per layer)"
        );
    }

    @Test
    void shouldAcceptAnElementWithoutRelationships() {
        val sys = io.morin.archicode.resource.element.application.System.builder()
            .id("sys")
            .relationships(null)
            .build();
        val workspace = workspaceFactory.create(
            io.morin.archicode.resource.workspace.Workspace.builder()
                .application(Application.builder().elements(Set.of(sys)).build())
                .build(),
            Map.of()
        );

        val graph = GetGraphQuery.buildGraph(workspace);

        assertTrue(graph.getRelationships().isEmpty());
        assertTrue(
            graph
                .getElements()
                .stream()
                .anyMatch(e -> "sys".equals(e.getReference()))
        );
    }

    @Test
    void shouldThrowArchiCodeExceptionOnDanglingDestination() {
        bind("src/test/workspaces/case_graph_dangling.yaml");

        assertThrows(ArchiCodeException.class, getGraphQuery::run);
    }
}

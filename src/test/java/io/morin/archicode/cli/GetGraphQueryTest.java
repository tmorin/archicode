package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GetGraphQueryTest {

    @Inject
    GetGraphQuery getGraphQuery;

    @Inject
    MapperFactory mapperFactory;

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
    void shouldThrowArchiCodeExceptionOnDanglingDestination() {
        bind("src/test/workspaces/case_graph_dangling.yaml");

        assertThrows(ArchiCodeException.class, getGraphQuery::run);
    }
}

package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

/**
 * The model of ArchiCode itself, {@code docs/architecture/} (wave 029, run 0209), is a workspace the command line loads:
 * 35 to 45 elements, every relationship leads to an element of its layer, {@code query graph} and {@code query views}
 * exit 0 with nothing on the error output, 4 or 5 saved views are listed, and the folder holds only YAML (no generated
 * {@code views-*} folder). The test reads the folder and writes nothing into it. The editor opens the same folder in
 * {@code architecture-model.test.js}.
 */
@QuarkusTest
class ArchitectureModelTest {

    private static final Path FOLDER = Path.of("docs/architecture");
    private static final Path WORKSPACE = FOLDER.resolve(".archicode.yaml");

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    io.morin.archicode.cli.ErrorOutput errorOutput;

    private ArchitectureGraph.Result run(String... args) {
        return ArchitectureGraph.run(factory, errorOutput, args);
    }

    @Test
    void shouldHaveTheWorkspaceFile() {
        assertTrue(Files.isRegularFile(WORKSPACE), "the model has a workspace file: " + WORKSPACE);
    }

    @Test
    void shouldLoadBetween35And45ElementsWhoseRelationshipsLeadToAnElement() {
        val workspace = workspaceFactory.create(WORKSPACE);
        val applications = workspace.appIndex.listAllElementReferences(e -> true);
        val technology = workspace.techIndex.listAllElementReferences(e -> true);
        val count = applications.size() + technology.size();
        assertTrue(count >= 35 && count <= 45, "the model has 35 to 45 elements: " + count);
        assertFalse(technology.isEmpty(), "the model has a technology layer");
        assertDestinationsExist(workspace.appIndex, applications);
        assertDestinationsExist(workspace.techIndex, technology);
    }

    private static void assertDestinationsExist(ElementIndex index, Iterable<String> references) {
        for (val reference : references) {
            for (val relationship : index.getElementByReference(reference).getRelationships()) {
                assertTrue(
                    index.searchElement(relationship.getDestination()).isPresent(),
                    reference + " points at " + relationship.getDestination() + ", which does not exist"
                );
            }
        }
    }

    @Test
    void shouldAnswerQueryGraphWithNothingOnTheErrorOutput() {
        val result = run("-w", WORKSPACE.toString(), "query", "graph");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err(), "no warning, no error");
    }

    @Test
    @SneakyThrows
    void shouldListFourOrFiveSavedViews() {
        val result = run("-w", WORKSPACE.toString(), "query", "views", "-f", "json");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err(), "no warning, no error");
        val ids = new ArrayList<String>();
        for (val view : new ObjectMapper().readTree(result.out())) {
            // the query also lists the views the tool derives for every element; only a saved view has a name
            if (view.has("name")) {
                ids.add(view.get("id").asText());
            }
        }
        assertTrue(ids.size() >= 4 && ids.size() <= 5, "the model has 4 or 5 saved views: " + ids);
    }

    @Test
    @SneakyThrows
    void shouldHoldOnlyYamlAndNoGeneratedViewsFolder() {
        assertTrue(Files.isDirectory(FOLDER), "the model folder exists: " + FOLDER);
        val offenders = new ArrayList<String>();
        try (val files = Files.walk(FOLDER)) {
            for (val file : files.toList()) {
                val name = file.getFileName().toString();
                val isViewsFolder =
                    Files.isDirectory(file) &&
                    name.startsWith("views") &&
                    !file.equals(FOLDER.resolve("manifests/views"));
                val isOtherFile = Files.isRegularFile(file) && !name.endsWith(".yaml");
                if (isViewsFolder || isOtherFile) {
                    offenders.add(file.toString());
                }
            }
        }
        assertEquals(List.of(), offenders, "the model folder holds YAML only and no generated views folder");
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The editor keeps stories, and the views they are made of, in {@code workspace.yaml}. The command line reads them
 * (and warns about a step on a view nobody declared) but only generates the views of its own viewpoints: the map,
 * drawn by the editor, is skipped instead of stopping the generation.
 */
@QuarkusTest
class StoriesTest extends AbstractGenerateViews {

    private static final String WORKSPACE =
        """
        application:
          elements:
            - kind: "solution"
              id: "sol_a"
              elements:
                - kind: "system"
                  id: "sys_aa"
        views:
          - id: "sol_overview"
            name: "Sol A — Overview"
            viewpoint: "overview"
            layer: "application"
            properties:
              element: "sol_a"
              facet: "flow"
          - id: "the_map"
            name: "Map of Sol A"
            viewpoint: "map"
            layer: "application"
            properties:
              pinned:
                - "sol_a"
        stories:
          - id: "tour"
            name: "Tour"
            description: "How Sol A is made"
            steps:
              - view: "sol_overview"
                text: "Sol A is one system.\\nNothing else."
              - view: "the_map"
              - view: "nobody_declared_this"
        """;

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path directory;

    @SneakyThrows
    @Test
    void shouldReadTheStoriesAndTheViewsTheEditorKeeps() {
        val path = Files.writeString(directory.resolve("workspace.yaml"), WORKSPACE);

        val workspace = workspaceFactory.create(path);

        val story = workspace.getStories().iterator().next();
        assertEquals("tour", story.getId());
        assertEquals("Tour", story.getName());
        assertEquals(3, story.getSteps().size());
        assertEquals("sol_overview", story.getSteps().get(0).getView());
        assertEquals("Sol A is one system.\nNothing else.", story.getSteps().get(0).getText());
        assertEquals(2, workspace.getViews().size());
        assertTrue(workspace.viewIndex.searchView("the_map").isPresent());
    }

    @SneakyThrows
    @Test
    void shouldSkipTheViewsOfAViewpointItDoesNotGenerate() {
        val path = Files.writeString(directory.resolve("workspace.yaml"), WORKSPACE);

        renderWithPlantuml(path, "sol_overview", "the_map");

        try (val files = Files.walk(directory)) {
            val generated = files.filter(file -> file.toString().endsWith(".puml")).toList();
            assertTrue(
                generated.stream().anyMatch(file -> file.getFileName().toString().contains("sol_overview")),
                generated.toString()
            );
            assertTrue(generated.stream().noneMatch(file -> file.getFileName().toString().contains("the_map")));
        }
    }
}

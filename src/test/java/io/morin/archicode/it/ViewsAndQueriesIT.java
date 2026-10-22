package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.EXAMPLES;
import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.LaunchResult;
import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The packaged application on the example of the manual's workspace chapter ({@code domain_workspace}): the kernel
 * (WebAssembly translated to bytecode) assembles the views, the renderer writes PlantUML, and Jackson reaches the model and
 * the results by reflection (the part a missing registration breaks in a native image).
 */
@QuarkusMainIntegrationTest
class ViewsAndQueriesIT {

    @TempDir
    Path dir;

    @Test
    void helpIsPrinted(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("--help"));
        assertTrue(result.getOutput().contains("views"), () -> said(result));
    }

    @Test
    void viewsGenerateWritesThePlantUml(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "workspace");
        succeeded(launcher.launch("-w", workspace(folder), "views", "generate", "-o", "views"));
        notEmpty(folder.resolve("views/plantuml/application/ArchiCode-overview.puml"));
    }

    @Test
    void queryViewsListsTheViews(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "workspace");
        val result = succeeded(launcher.launch("-w", workspace(folder), "query", "views"));
        assertTrue(result.getOutput().contains("ArchiCode-deep"), () -> said(result));
    }

    @Test
    void querySchemasWritesTheJsonSchemas(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "workspace");
        val result = succeeded(launcher.launch("-w", workspace(folder), "query", "schemas"));
        assertTrue(result.getOutput().contains("urn:jsonschema"), () -> said(result));
    }

    @Test
    void queryGraphWritesTheGraph(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "workspace");
        val result = succeeded(launcher.launch("-w", workspace(folder), "query", "graph"));
        assertTrue(result.getOutput().contains("\"reference\":\"ArchiCode\""), () -> said(result));
    }

    @Test
    void aWorkspaceThatIsNotThereIsOneErrorLine(QuarkusMainLauncher launcher) {
        val result = launcher.launch("-w", dir.resolve("nothing/.archicode.yaml").toString(), "views", "generate");
        assertTrue(result.exitCode() == 1, () -> said(result));
        assertTrue(
            result
                .getErrorOutput()
                .lines()
                .anyMatch(line -> line.startsWith("error: ")),
            () -> said(result)
        );
        assertTrue(!result.getErrorOutput().contains("\tat "), () -> "a stack trace\n" + said(result));
    }

    /** A view named with {@code -i} whose element a facet removes: one line that says the view and the facet, nothing written (#121). */
    @Test
    @SneakyThrows
    void aViewWhoseElementAFacetRemovesIsOneErrorLineAndWritesNothing(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(Shipped.BRIGHTCART, dir, "brightcart");
        Files.writeString(
            folder.resolve("shared/view.saas_probe.yaml"),
            String.join(
                "\n",
                "header:",
                "  kind: \"archicode.morin.io/view\"",
                "  version: \"1\"",
                "content:",
                "  id: \"saas_probe\"",
                "  viewpoint: \"overview\"",
                "  layer: \"application\"",
                "  properties:",
                "    element: \"commerce-saas\"",
                ""
            )
        );
        val result = launcher.launch(
            "-w",
            workspace(folder),
            "views",
            "generate",
            "--plateau",
            "saas",
            "-i",
            "saas_probe"
        );
        assertEquals(1, result.exitCode(), () -> said(result));
        assertEquals(
            "error: the view `saas_probe` cannot be drawn: it names `commerce-saas`, which the facet `no-externals` removes",
            result.getErrorOutput().strip(),
            () -> said(result)
        );
        try (val folders = Files.list(folder)) {
            assertTrue(folders.noneMatch(path -> path.getFileName().toString().startsWith("views")), () ->
                said(result)
            );
        }
    }
}

package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.cli.ArchiCode;
import io.morin.archicode.cli.ErrorOutput;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * E1 of {@code docs/fixtures/brightcart-spec.md} (section 12), as a workspace of its own: the plateau {@code b} replaces
 * a container of {@code a}, and the node of {@code a} that deployed that container is gone in {@code b}. The comparison
 * keeps the node as removed, and what it deployed or used must still point at something in the comparison, or drawing the
 * views of the comparison stops on a dangling reference. The workspace is the four small files of the document (two
 * manifests per plateau) and its {@code workspace.yaml}.
 */
@QuarkusTest
class ReplacedElementsViewsTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private record Result(int exit, String out, String err) {}

    @SneakyThrows
    private void write(String file, String text) {
        val path = dir.resolve(file);
        Files.createDirectories(path.getParent());
        Files.writeString(path, text);
    }

    private static String system(String body) {
        return (
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "s"
              name: "S"
              elements:
            """ + body
        );
    }

    private static String environment(String body) {
        return (
            """
            header:
              kind: "archicode.morin.io/environment"
              version: "1"
            content:
              id: "e"
              name: "E"
              elements:
            """ + body
        );
    }

    /** The two plateaus: {@code before} is an empty layer over the root, {@code after} overrides it with these patches. */
    private void plateaus(String patches) {
        write(
            "plateaus/a/plateau.yaml",
            """
            header:
              kind: "archicode.morin.io/plateau"
              version: "1"
            content:
              id: "before"
            """
        );
        write(
            "plateaus/b/plateau.yaml",
            """
            header:
              kind: "archicode.morin.io/plateau"
              version: "1"
            content:
              id: "after"
              override: "before"
            """ + patches
        );
    }

    private Path workspace() {
        write(
            "workspace.yaml",
            """
            settings:
              facets:
                customs:
                  - name: "nothing"
                    actions:
                      - operator: REMOVE
                        json-path: "$.application..elements[?(@.id == 'zzz')]"
              manifests:
                paths: ["plateaus/**"]
            """
        );
        plateaus(
            """
              patches:
                - operator: REMOVE
                  target: "s.x"
                - operator: REMOVE
                  target: "e.n"
                  layer: technology
            """
        );
        write(
            "plateaus/a/app.yaml",
            system(
                """
                    - kind: "container"
                      id: "x"
                      name: "X"
                """
            )
        );
        write(
            "plateaus/a/tec.yaml",
            environment(
                """
                    - kind: "node"
                      id: "n"
                      name: "N"
                      applications:
                        - "s.x"
                """
            )
        );
        write(
            "plateaus/b/app.y.yaml",
            """
            header:
              kind: "archicode.morin.io/container"
              version: "1"
              plateau: "after"
              parent: "s"
            content:
              id: "y"
              name: "Y"
              replaces:
                - "s.x"
            """
        );
        write(
            "plateaus/b/tec.m.yaml",
            """
            header:
              kind: "archicode.morin.io/node"
              version: "1"
              plateau: "after"
              parent: "e"
            content:
              id: "m"
              name: "M"
              applications:
                - "s.y"
            """
        );
        return dir.resolve("workspace.yaml");
    }

    private Result run(String... args) {
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
            errorOutput.install(commandLine);
            val exit = commandLine.execute(args);
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    @Test
    void theComparisonViewsOfAPlateauWhoseElementReplacesAnotherAreGenerated() {
        val workspace = workspace();
        val diff = run("-w", workspace.toString(), "diff", "--plateau", "after");
        assertEquals(0, diff.exit(), diff.err());

        val result = run("-w", workspace.toString(), "views", "generate", "--plateau", "after");

        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
        assertTrue(Files.isDirectory(dir.resolve("views-after")), "the views of the plateau");
        assertTrue(Files.isDirectory(dir.resolve("views-after-vs-before")), "the views of the comparison");
        assertTrue(Files.exists(dir.resolve("views-after-vs-before/gap.json")), "the table of changes");
        // a facet draws the comparison from the workspace the facet left: the removed node still deploys what replaced its application
        assertTrue(
            Files.isDirectory(dir.resolve("views-after-vs-before-nothing")),
            "the views of a facet of the comparison"
        );
    }

    @Test
    void theRemovedNodeOfTheComparisonDeploysWhatReplacedTheApplicationItDeployed() {
        val workspace = workspace();
        val result = run("-w", workspace.toString(), "views", "generate", "--plateau", "after");
        assertEquals(0, result.exit(), result.err());

        // the removed node `n` stays in the comparison, on the application that took the place of `s.x`
        val views = dir.resolve("views-after-vs-before");
        val text = tree(views);
        assertFalse(text.isEmpty(), "something was drawn");
        assertTrue(text.contains("N"), "the removed node is drawn");
        assertTrue(text.contains("M"), "and so is the new one");
    }

    /** The system {@code shop} and its web container become {@code storefront} and its web container; {@code shop.old} goes. */
    private Path workspaceWithAReplacedBox() {
        write(
            "workspace.yaml",
            """
            settings:
              manifests:
                paths: ["plateaus/**"]
            """
        );
        plateaus(
            """
              patches:
                - operator: REMOVE
                  target: "shop"
            """
        );
        write(
            "plateaus/a/app.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "shop"
              name: "Shop"
              elements:
                - kind: "container"
                  id: "web"
                  name: "Web"
                - kind: "container"
                  id: "old"
                  name: "Old"
            """
        );
        write(
            "plateaus/b/app.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
              plateau: "after"
            content:
              id: "storefront"
              name: "Storefront"
              replaces:
                - "shop"
              elements:
                - kind: "container"
                  id: "web"
                  name: "Web"
                  replaces:
                    - "shop.web"
            """
        );
        return dir.resolve("workspace.yaml");
    }

    @Test
    void aReplacedBoxThatHoldsSomethingRemovedIsInTheWorkspaceOfTheComparisonWithoutWhatWasReplaced() {
        val workspace = workspaceWithAReplacedBox();
        val base = workspaceFactory.create(workspace, null, "before");
        val target = workspaceFactory.create(workspace, null, "after");
        val comparison = new PlateauComparer(new ObjectMapper()).compare(base, target);
        val union = workspaceFactory.createUnion(workspace, null, "after", base, comparison);

        assertTrue(union.appIndex.searchElement("shop").isPresent(), "the place that holds what was removed");
        assertTrue(union.appIndex.searchElement("shop.old").isPresent(), "what was removed");
        assertTrue(union.appIndex.searchElement("storefront.web").isPresent(), "and what is new");
        assertFalse(union.appIndex.searchElement("shop.web").isPresent(), "what was replaced is not in the comparison");
        // the baseline is as it was
        assertTrue(base.appIndex.searchElement("shop.web").isPresent());

        val result = run("-w", workspace.toString(), "views", "generate", "--plateau", "after");
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isDirectory(dir.resolve("views-after-vs-before")));
    }

    @SneakyThrows
    private static String tree(Path folder) {
        val out = new StringBuilder();
        try (val files = Files.walk(folder)) {
            for (val file : files
                .filter(f -> f.toString().endsWith(".puml"))
                .sorted()
                .toList()) {
                out.append(Files.readString(file));
            }
        }
        return out.toString();
    }
}

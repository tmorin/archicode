package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A view that the command is asked for by its id ({@code views generate -i}) and whose element a facet removes (wave 017,
 * run 0119, issue #121; decision T5 of the plan): one {@code error:} line that names the view, the element and the facet,
 * exit code 1, and no folder written, instead of {@code dangling reference: x} after the folders before the facet. The
 * workspaces are copies of the layered Brightcart fixture and of a facet example of the manual, with a probe view added.
 */
@QuarkusTest
class ViewRemovedByFacetTest {

    private static final Path BRIGHTCART = Path.of("src/test/resources/brightcart/layered");
    private static final Path FACET_EXAMPLE = Path.of("src/doc/examples/facet_example_step_4");

    /** The view of the issue: {@code commerce-saas} exists in {@code saas} and the facet {@code no-externals} removes it. */
    private static final String SAAS_PROBE = """
      header:
        kind: "archicode.morin.io/view"
        version: "1"
      content:
        id: "saas_probe"
        viewpoint: "overview"
        layer: "application"
        properties:
          element: "commerce-saas"
    """;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private static Path copy(Path from, Path into) {
        try (val files = Files.walk(from)) {
            for (val source : files.toList()) {
                val relative = from.relativize(source);
                if (relative.toString().startsWith("views-")) {
                    continue;
                }
                val target = into.resolve(relative.toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        return into.resolve(".archicode.yaml");
    }

    @SneakyThrows
    private Path brightcart() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        Files.writeString(workspace.resolveSibling("shared/view.saas_probe.yaml"), SAAS_PROBE);
        return workspace;
    }

    private CliHarness.Result generate(Path workspace, String... more) {
        val args = new java.util.ArrayList<>(List.of("--workspace", workspace.toString(), "views", "generate"));
        args.addAll(List.of(more));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    /** The folders of the views that a run wrote next to the workspace file. */
    @SneakyThrows
    private static List<String> viewFolders(Path workspace) {
        try (val files = Files.list(workspace.getParent())) {
            return files
                .filter(Files::isDirectory)
                .map(path -> path.getFileName().toString())
                .filter(name -> name.startsWith("views"))
                .sorted()
                .toList();
        }
    }

    @Test
    void theViewOfTheIssueFailsInOneLineThatNamesTheViewTheElementAndTheFacetAndWritesNothing() {
        val workspace = brightcart();
        val result = generate(workspace, "--plateau", "saas", "-i", "saas_probe");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view `saas_probe` cannot be drawn: it names `commerce-saas`, which the facet `no-externals` removes\n",
            result.err()
        );
        assertEquals("", result.out());
        assertEquals(List.of(), viewFolders(workspace), "not a folder of the plateau, of its comparison or of a facet");
    }

    @Test
    void theComparisonIsLookedAtBeforeAnythingIsWrittenToo() {
        // `commerce-saas` is in `saas`, the plateau compared with: the union of the comparison has it, `baseline` does not,
        // and the facet removes it from the views of the comparison
        val workspace = brightcart();
        val result = generate(workspace, "--plateau", "baseline", "--against", "saas", "-i", "saas_probe");
        assertEquals(1, result.exit(), result.err());
        assertTrue(
            result.err().endsWith("which the facet `no-externals` removes\n") &&
                result
                    .err()
                    .lines()
                    .filter(line -> line.startsWith("error:"))
                    .count() == 1,
            result.err()
        );
        assertEquals(List.of(), viewFolders(workspace));
    }

    @Test
    void aViewWhoseElementNoFacetRemovesIsDrawnAsItWas() {
        val workspace = brightcart();
        val result = generate(workspace, "--plateau", "saas", "-i", "shop_overview");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
        assertTrue(Files.exists(workspace.resolveSibling("views-saas/plantuml/application/shop_overview.puml")));
        assertTrue(
            Files.exists(workspace.resolveSibling("views-saas-no-externals/plantuml/application/shop_overview.puml"))
        );
        assertFalse(Files.exists(workspace.resolveSibling("views-saas/plantuml/application/saas_probe.puml")));
    }

    @Test
    void theViewIsNotAskedForSoTheFacetsDropItsElementWithoutAWord() {
        val workspace = brightcart();
        val result = generate(workspace, "--plateau", "saas");
        assertEquals(0, result.exit(), result.err());
        assertFalse(result.err().contains("saas_probe"), result.err());
        assertFalse(
            Files.exists(workspace.resolveSibling("views-saas-no-externals/plantuml/application/saas_probe.puml"))
        );
    }

    @Test
    void aWorkspaceWithoutPlateausSaysTheSame() {
        val workspace = copy(FACET_EXAMPLE, dir.resolve("facets"));
        // the last entry of `settings.facets.customs` is a facet, so another facet goes after it, and the views at the end
        append(
            workspace,
            String.join(
                "\n",
                "      - name: \"no-identity-provider\"",
                "        actions:",
                "          - operator: \"REMOVE\"",
                "            json-path: \"$.application..elements[?(@.id == 'SocialIdentityProvider')]\"",
                "views:",
                "  - kind: \"view\"",
                "    id: \"provider\"",
                "    viewpoint: \"overview\"",
                "    layer: \"application\"",
                "    properties:",
                "      element: \"SocialIdentityProvider\""
            )
        );
        val result = generate(workspace, "-i", "provider");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view `provider` cannot be drawn: it names `SocialIdentityProvider`, which the facet `no-identity-provider` removes\n",
            result.err()
        );
        assertEquals(List.of(), viewFolders(workspace));
    }

    @SneakyThrows
    private static void append(Path workspace, String text) {
        Files.writeString(workspace, Files.readString(workspace) + "\n" + text);
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode stories generate} (wave 018, run 0135, issue #109, decision D6 and T5 of the plan): the steps of a story
 * are drawn at the plateau they are told at and compared with the one they say, in {@code <views.path>-stories}. The workspaces
 * are copies of the layered Brightcart fixture (the story {@code fork_tour}, steps told at four plateaus) and of the manual's
 * {@code domain_plateaus} (the story {@code migration}).
 */
@QuarkusTest
class GenerateStoriesTest {

    private static final Path BRIGHTCART = Path.of("src/test/resources/brightcart/layered");
    private static final Path PLATEAUS = Path.of("src/doc/examples/domain_plateaus");

    /** A step that names an element only {@code saas} has, told at a plateau that lacks it, and a story with no step. */
    private static final String LACKING = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "lacking"
        steps:
          - viewpoint: "overview"
            layer: "application"
            properties:
              element: "commerce-saas"
            at: "inhouse"
          - viewpoint: "overview"
            layer: "application"
            properties:
              element: "shop"
            at: "inhouse"
    """;

    /** A step that names the cart, which the facet {@code without-cart} removes. */
    private static final String CART = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "cart_story"
        steps:
          - viewpoint: "overview"
            layer: "application"
            properties:
              element: "shop.app.cart"
            at: "baseline"
    """;

    private static final String EMPTY = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "empty"
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
                if (relative.toString().startsWith("views")) {
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
        return into.resolve("workspace.yaml");
    }

    private CliHarness.Result stories(Path workspace, String... more) {
        val args = new ArrayList<>(List.of("--workspace", workspace.toString(), "stories", "generate"));
        args.addAll(List.of(more));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    @SneakyThrows
    private static String puml(Path workspace, String story, String step, String viewpointLayerAndFile) {
        return Files.readString(
            workspace.resolveSibling("views-stories/" + story + "/" + step + "/plantuml/" + viewpointLayerAndFile)
        );
    }

    @Test
    @SneakyThrows
    void theStepsOfForkTourAreDrawnAtTheirPlateausAndAgainstTheirs() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        val result = stories(workspace, "--plateau", "marketplace", "--story", "fork_tour");
        assertEquals(0, result.exit(), result.err());
        for (val file : List.of(
            "01-shop_overview/plantuml/application/shop_overview.puml",
            "02-overview/plantuml/application/step_02.puml",
            "03-commerce_overview/plantuml/application/commerce_overview.puml",
            "04-overview/plantuml/application/step_04.puml",
            "05-marketplace_overview/plantuml/application/marketplace_overview.puml",
            "06-overview/plantuml/application/step_06.puml",
            "07-overview/plantuml/application/step_07.puml"
        )) {
            assertTrue(Files.size(workspace.resolveSibling("views-stories/fork_tour/" + file)) > 0, file);
        }
        // step 2 is told at saas and compared with baseline: the platform is new; step 1 is not a comparison
        assertTrue(puml(workspace, "fork_tour", "02-overview", "application/step_02.puml").contains("<<new>>"));
        assertFalse(
            puml(workspace, "fork_tour", "01-shop_overview", "application/shop_overview.puml").contains("<<new>>")
        );
        // nothing but the folder of the stories is written
        assertFalse(Files.exists(workspace.resolveSibling("views-marketplace")));
    }

    @Test
    @SneakyThrows
    void aStepWithoutPlateauIsDrawnAtThePlateauChosenAndAMapIsDrawn() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        val result = stories(workspace, "--plateau", "marketplace", "-s", "seller_journey", "-s", "order_journey");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            Files.size(
                workspace.resolveSibling("views-stories/seller_journey/02-cloud_map/plantuml/technology/cloud_map.puml")
            ) > 0
        );
        assertTrue(Files.exists(workspace.resolveSibling("views-stories/order_journey/01-" + firstViewOf(workspace))));
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/fork_tour")));
    }

    @SneakyThrows
    private static String firstViewOf(Path workspace) {
        try (val files = Files.list(workspace.resolveSibling("views-stories/order_journey"))) {
            return files
                .map(p -> p.getFileName().toString())
                .filter(n -> n.startsWith("01-"))
                .findFirst()
                .orElseThrow()
                .substring(3);
        }
    }

    @Test
    @SneakyThrows
    void aStepComparedWithThePlateauDrawnIsSkippedWithAWarning() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        val result = stories(workspace, "--plateau", "saas", "-s", "fork_tour");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result.err().contains("warning: skip fork_tour/7: it is told at the plateau `saas` and compared with it"),
            result.err()
        );
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/fork_tour/07-overview")));
        assertTrue(Files.exists(workspace.resolveSibling("views-stories/fork_tour/06-overview")));
    }

    @Test
    @SneakyThrows
    void aNameThePlateauOfAStepLacksIsAWarningAndAStepIsSkippedTheRunGoesOn() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        write(workspace, "shared/story.lacking.yaml", LACKING);
        write(workspace, "shared/story.empty.yaml", EMPTY);
        val result = stories(workspace, "--plateau", "saas", "-s", "lacking", "-s", "empty");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .contains(
                    "warning: skip lacking/1: it names `commerce-saas`, which the plateau `inhouse` does not have\n"
                ),
            result.err()
        );
        assertTrue(result.err().contains("warning: skip `empty`: the story has no step\n"), result.err());
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/lacking/01-overview")));
        assertTrue(
            Files.exists(
                workspace.resolveSibling("views-stories/lacking/02-overview/plantuml/application/step_02.puml")
            )
        );
    }

    @Test
    @SneakyThrows
    void anUnknownStoryIsOneErrorLineAndNothingIsWritten() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        val result = stories(workspace, "--plateau", "saas", "-s", "nope", "-s", "fork_tour");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: no story `nope` in the workspace (known: fork_tour, order_journey, seller_journey)\n",
            result.err()
        );
        assertFalse(Files.exists(workspace.resolveSibling("views-stories")));
    }

    @Test
    @SneakyThrows
    void theManualsMigrationIsDrawnAtItsPlateausAndAgainstBaseline() {
        val workspace = copy(PLATEAUS, dir.resolve("plateaus"));
        val result = stories(workspace);
        assertEquals(0, result.exit(), result.err());
        val steps = workspace.resolveSibling("views-stories/migration");
        for (val step : List.of("01-overview", "02-overview", "03-overview", "04-overview")) {
            assertTrue(Files.isDirectory(steps.resolve(step)), step);
        }
        // told at to-be and compared with baseline: the shop holds changes
        assertTrue(
            puml(workspace, "migration", "02-overview", "application/step_02.puml").contains("<<contains-changes>>")
        );
        assertFalse(
            puml(workspace, "migration", "01-overview", "application/step_01.puml").contains("<<contains-changes>>")
        );
    }

    @Test
    @SneakyThrows
    void aStepThatComparesWritesTheTableOfChangesViewsGenerateWritesForThePair() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        assertEquals(0, stories(workspace, "--plateau", "marketplace", "--story", "fork_tour").exit());
        val views = CliHarness.run(
            factory,
            errorOutput,
            "--workspace",
            workspace.toString(),
            "views",
            "generate",
            "--plateau",
            "saas",
            "--against",
            "baseline"
        );
        assertEquals(0, views.exit(), views.err());
        val step = workspace.resolveSibling("views-stories/fork_tour/02-overview");
        for (val name : List.of("gap.md", "gap.json")) {
            assertEquals(
                Files.readString(workspace.resolveSibling("views-saas-vs-baseline/" + name)),
                Files.readString(step.resolve(name)),
                name
            );
        }
        // a step that compares nothing has no table
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/fork_tour/01-shop_overview/gap.md")));
    }

    @Test
    @SneakyThrows
    void theFacetsAreDrawnBesideEachStepFolderAndAFacetThatRemovesTheElementIsSkipped() {
        val workspace = copy(BRIGHTCART, dir.resolve("brightcart"));
        write(workspace, "shared/story.cart.yaml", CART);
        val result = stories(workspace, "--plateau", "marketplace", "--story", "fork_tour", "--story", "cart_story");
        assertEquals(0, result.exit(), result.err());
        val steps = workspace.resolveSibling("views-stories/fork_tour");
        for (val facet : List.of("journey", "no-externals", "without-cart")) {
            assertTrue(
                Files.size(steps.resolve("01-shop_overview-" + facet + "/plantuml/application/shop_overview.puml")) > 0,
                facet
            );
        }
        // a compared step: the facets are drawn on the comparison, and the table is in the folder of the step only
        assertTrue(puml(workspace, "fork_tour", "02-overview-journey", "application/step_02.puml").contains("<<new>>"));
        assertFalse(Files.exists(steps.resolve("02-overview-journey/gap.md")));
        assertTrue(Files.exists(steps.resolve("02-overview/gap.md")));
        // the global folder is as it was
        assertTrue(Files.exists(steps.resolve("01-shop_overview/plantuml/application/shop_overview.puml")));
        val cart = workspace.resolveSibling("views-stories/cart_story");
        assertTrue(Files.isDirectory(cart.resolve("01-overview")));
        assertTrue(Files.isDirectory(cart.resolve("01-overview-journey")));
        assertFalse(Files.exists(cart.resolve("01-overview-without-cart")));
        assertTrue(
            result
                .err()
                .contains(
                    "warning: skip cart_story/1 in the facet `without-cart`: it names `shop.app.cart`, which the facet removes"
                ),
            result.err()
        );
    }

    @Test
    @SneakyThrows
    void globalEnabledFalseDrawsOnlyTheFacets() {
        val workspace = copy(PLATEAUS, dir.resolve("plateaus"));
        val yaml = Files.readString(workspace);
        Files.writeString(
            workspace,
            yaml.replaceFirst(
                "settings:",
                "settings:\n  facets:\n    global-enabled: false\n    customs:\n      - name: \"none\"\n        actions: []"
            )
        );
        val result = stories(workspace, "--story", "migration");
        assertEquals(0, result.exit(), result.err());
        val steps = workspace.resolveSibling("views-stories/migration");
        assertFalse(Files.exists(steps.resolve("01-overview")));
        assertTrue(Files.isDirectory(steps.resolve("02-overview-none")));
        // the table of a comparison is written whatever the global views
        assertTrue(Files.exists(steps.resolve("02-overview/gap.md")));
        assertFalse(Files.exists(steps.resolve("02-overview/plantuml")));
    }

    @SneakyThrows
    private static void write(Path workspace, String name, String text) {
        Files.writeString(workspace.resolveSibling(name), text);
    }
}

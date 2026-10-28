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

    /** A story whose steps carry an inline Map recipe with {@code links}, told at {@code baseline}, which has no partner. */
    private static final String LINKS_STORY = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "links_story"
        steps:
          - viewpoint: "map"
            layer: "application"
            at: "baseline"
            properties:
              opened: ["shop"]
              links:
                - {source: "shop.web", destination: "shop.api", label: "calls"}
          - viewpoint: "map"
            layer: "application"
            at: "baseline"
            properties:
              links:
                - {source: "partner", destination: "shop.web", label: "pushes"}
          - viewpoint: "map"
            layer: "application"
            at: "baseline"
            properties:
              opened: ["shop"]
              links:
                - {source: "shop.web", destination: "shop.api", label: "calls"}
                - {source: "partner", destination: "shop.web", label: "pushes"}
    """;

    /** A story whose steps name a saved Map with a highlight, or carry their own recipe, and say their own {@code highlight}. */
    private static final String HIGHLIGHT_STORY = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "hl_story"
        steps:
          - view: "hl_view"
          - view: "hl_view"
            highlight:
              - {source: "shop.api", destination: "shop.billing", label: "bills"}
          - view: "hl_view"
            highlight: []
          - viewpoint: "map"
            layer: "application"
            properties:
              opened: ["shop"]
              highlight:
                - {source: "shop.web", destination: "shop.api", label: "calls"}
            highlight:
              - {source: "shop.api", destination: "shop.billing", label: "bills"}
          - viewpoint: "map"
            layer: "application"
            properties:
              opened: ["shop"]
            highlight:
              - {source: "shop.web", destination: "shop.api", label: "calls"}
          - viewpoint: "map"
            layer: "application"
            properties:
              opened: ["shop"]
    """;

    /** A story whose step highlights a relationship that does not exist. */
    private static final String BAD_HIGHLIGHT_STORY = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "bad_story"
        steps:
          - viewpoint: "map"
            layer: "application"
            properties:
              opened: ["shop"]
            highlight:
              - {source: "shop.web", destination: "shop.api", label: "reads"}
    """;

    /** A story told at {@code baseline}, which has no partner, and whose steps highlight the partner. */
    private static final String PLATEAU_HIGHLIGHT_STORY = """
      header:
        kind: "archicode.morin.io/story"
        version: "1"
      content:
        id: "plateau_hl"
        steps:
          - viewpoint: "map"
            layer: "application"
            at: "baseline"
            properties:
              opened: ["shop"]
            highlight:
              - {source: "shop.web", destination: "shop.api", label: "calls"}
              - {source: "partner", destination: "shop.web", label: "pushes"}
          - viewpoint: "map"
            layer: "application"
            at: "baseline"
            properties:
              opened: ["shop"]
              links:
                - {source: "partner", destination: "shop.web", label: "pushes"}
            highlight:
              - {source: "partner", destination: "shop.web", label: "pushes"}
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
        return into.resolve(".archicode.yaml");
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
        for (val step : List.of("01-overview", "02-overview", "03-detailed", "04-overview")) {
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

    @Test
    @SneakyThrows
    void globalEnabledFalseWithoutFacetSaysThatNothingIsDrawn() {
        val workspace = copy(PLATEAUS, dir.resolve("plateaus"));
        val yaml = Files.readString(workspace);
        Files.writeString(workspace, yaml.replaceFirst("settings:", "settings:\n  facets:\n    global-enabled: false"));
        val result = stories(workspace, "--story", "migration");
        assertEquals(0, result.exit(), result.err());
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/migration/01-overview")));
        val said =
            "warning: the global views are turned off (`global-enabled: false`) and the workspace has no facet: the steps of the stories are not drawn";
        assertTrue(result.err().contains(said), result.err());
        assertEquals(
            1,
            result.err().split(java.util.regex.Pattern.quote(said), -1).length - 1,
            "said once: " + result.err()
        );
    }

    @Test
    @SneakyThrows
    void aStepWithAnInlineMapAndLinksDrawsTheLinksAndSkipsOrWarnsLikeAView() {
        val workspace = MapLinksTest.layered(dir.resolve("links"), LINKS_STORY);
        val result = stories(workspace, "--plateau", "to-be", "--story", "links_story");
        assertEquals(0, result.exit(), result.err());
        val first = puml(workspace, "links_story", "01-map", "application/step_01.puml");
        assertTrue(first.contains("Web site") && first.contains("calls"), first);
        assertFalse(first.contains("Billing") || first.contains("Customer"), first);
        assertTrue(
            result.err().contains("warning: skip links_story/2: none of its links is in the plateau `baseline`\n"),
            result.err()
        );
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/links_story/02-map")));
        assertTrue(
            result
                .err()
                .contains(
                    "warning: the step links_story/3 is drawn without the link `partner -> shop.web`, which the plateau `baseline` does not have\n"
                ),
            result.err()
        );
        assertFalse(
            puml(workspace, "links_story", "03-map", "application/step_03.puml").contains("Partner"),
            "step 3 is drawn without the partner"
        );
    }

    @Test
    @SneakyThrows
    void aStepHighlightReplacesTheHighlightOfTheViewItDrawsAndNeverWritesTheView() {
        val workspace = MapLinksTest.plain(
            dir.resolve("hl"),
            MapLinksTest.mapView(
                "hl_view",
                """
                opened: ["shop"]
                highlight:
                  - {source: "shop.web", destination: "shop.api", label: "calls"}
                """
            )
        );
        write(workspace, "manifests/story.yaml", HIGHLIGHT_STORY);
        val savedView = Files.readString(workspace.resolveSibling("manifests/view.yaml"));
        val result = stories(workspace, "--story", "hl_story");
        assertEquals(0, result.exit(), result.err());
        val calls = "**<U+25B6>** **calls**";
        val bills = "**<U+25B6>** **bills**";
        // 1: no key on the step, the highlight of the view
        val first = puml(workspace, "hl_story", "01-hl_view", "application/hl_view.puml");
        assertTrue(first.contains(calls) && !first.contains(bills), first);
        // 2: the key on the step replaces it
        val second = puml(workspace, "hl_story", "02-hl_view", "application/hl_view.puml");
        assertTrue(second.contains(bills) && !second.contains(calls), second);
        // 3: an empty list switches it off, and nothing is calm either
        val third = puml(workspace, "hl_story", "03-hl_view", "application/hl_view.puml");
        assertFalse(third.contains("D55E00") || third.contains("A6A6A6"), third);
        // 4: a step with its own recipe, and the key twice: the key of the step wins
        val fourth = puml(workspace, "hl_story", "04-map", "application/step_04.puml");
        assertTrue(fourth.contains(bills) && !fourth.contains(calls), fourth);
        // 5: the key of the step alone
        assertTrue(puml(workspace, "hl_story", "05-map", "application/step_05.puml").contains(calls));
        // 6: no highlight anywhere, a map as it always was
        val sixth = puml(workspace, "hl_story", "06-map", "application/step_06.puml");
        assertFalse(sixth.contains("D55E00") || sixth.contains("A6A6A6"), sixth);
        // the saved view is what it was, and drawn by `views generate` it still highlights the call
        assertEquals(savedView, Files.readString(workspace.resolveSibling("manifests/view.yaml")));
        val views = CliHarness.run(
            factory,
            errorOutput,
            "--workspace",
            workspace.toString(),
            "views",
            "generate",
            "-i",
            "hl_view"
        );
        assertEquals(0, views.exit(), views.err());
        val drawn = Files.readString(workspace.resolveSibling("views/plantuml/application/hl_view.puml"));
        assertTrue(drawn.contains(calls) && !drawn.contains(bills), drawn);
    }

    @Test
    @SneakyThrows
    void aStepHighlightThatNamesNoRelationshipIsOneErrorLine() {
        val workspace = MapLinksTest.plain(dir.resolve("bad"), null);
        write(workspace, "manifests/story.yaml", BAD_HIGHLIGHT_STORY);
        val result = stories(workspace, "--story", "bad_story");
        assertEquals(1, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .contains(
                    "`highlight[0]` names a relationship from `shop.web` to `shop.api` with the label `reads`, which does not exist"
                ),
            result.err()
        );
        assertTrue(result.err().startsWith("error: "), result.err());
        assertEquals(1, result.err().split("\n").length, result.err());
    }

    @Test
    @SneakyThrows
    void aStepHighlightThePlateauLacksIsAWarningAndTheStepIsDrawnWithoutItOrSkipped() {
        val workspace = MapLinksTest.layered(dir.resolve("plateau"), PLATEAU_HIGHLIGHT_STORY);
        val result = stories(workspace, "--plateau", "to-be", "--story", "plateau_hl");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .contains(
                    "warning: the step plateau_hl/1 is drawn without the highlight `partner -> shop.web`, which the plateau `baseline` does not have\n"
                ),
            result.err()
        );
        val first = puml(workspace, "plateau_hl", "01-map", "application/step_01.puml");
        assertTrue(first.contains("**<U+25B6>** **calls**"), first);
        assertFalse(first.contains("Partner"), first);
        // the second step's links all lack the plateau: skipped, as before the highlight
        assertTrue(
            result.err().contains("warning: skip plateau_hl/2: none of its links is in the plateau `baseline`\n"),
            result.err()
        );
        assertFalse(Files.exists(workspace.resolveSibling("views-stories/plateau_hl/02-map")));
    }

    @SneakyThrows
    private static void write(Path workspace, String name, String text) {
        Files.writeString(workspace.resolveSibling(name), text);
    }
}

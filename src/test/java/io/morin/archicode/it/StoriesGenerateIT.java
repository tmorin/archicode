package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.BRIGHTCART;
import static io.morin.archicode.it.Shipped.EXAMPLES;
import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@code stories generate} by the packaged application (wave 018, run 0135, issue #109): the steps of {@code fork_tour} (the
 * layered Brightcart) and of {@code migration} (the manual's {@code domain_plateaus}) drawn at their plateaus and against
 * theirs, a name that the plateau of a step lacks as a warning (exit 0), an unknown story as one {@code error:} line (exit 1).
 */
@QuarkusMainIntegrationTest
class StoriesGenerateIT {

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

    @TempDir
    Path dir;

    @Test
    void forkTourIsDrawnAtItsPlateausAndAgainstTheirs(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(BRIGHTCART, dir, "brightcart");
        succeeded(
            launcher.launch(
                "-w",
                workspace(folder),
                "stories",
                "generate",
                "--plateau",
                "marketplace",
                "-s",
                "fork_tour"
            )
        );
        val steps = folder.resolve("views-stories/fork_tour");
        notEmpty(steps.resolve("01-shop_overview/plantuml/application/shop_overview.puml"));
        notEmpty(steps.resolve("05-marketplace_overview/plantuml/application/marketplace_overview.puml"));
        val compared = steps.resolve("02-overview/plantuml/application/step_02.puml");
        notEmpty(compared);
        assertTrue(read(compared).contains("<<new>>"), "step 2 is told at saas, compared with baseline");
        assertFalse(
            read(steps.resolve("01-shop_overview/plantuml/application/shop_overview.puml")).contains("<<new>>")
        );
        notEmpty(steps.resolve("07-overview/plantuml/application/step_07.puml"));
    }

    @Test
    void aComparisonStepWritesItsTableAndTheFacetsAreDrawnBesideTheStepFolders(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(BRIGHTCART, dir, "brightcart");
        succeeded(
            launcher.launch(
                "-w",
                workspace(folder),
                "stories",
                "generate",
                "--plateau",
                "marketplace",
                "-s",
                "fork_tour"
            )
        );
        val steps = folder.resolve("views-stories/fork_tour");
        notEmpty(steps.resolve("02-overview/gap.md"));
        notEmpty(steps.resolve("02-overview/gap.json"));
        assertFalse(Files.exists(steps.resolve("01-shop_overview/gap.md")));
        for (val facet : new String[] { "journey", "no-externals", "without-cart" }) {
            notEmpty(steps.resolve("01-shop_overview-" + facet + "/plantuml/application/shop_overview.puml"));
        }
        assertTrue(read(steps.resolve("02-overview-journey/plantuml/application/step_02.puml")).contains("<<new>>"));
        assertFalse(Files.exists(steps.resolve("02-overview-journey/gap.md")));
    }

    @Test
    void migrationIsDrawnWithoutAnOption(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(EXAMPLES.resolve("domain_plateaus"), dir, "plateaus");
        succeeded(launcher.launch("-w", workspace(folder), "stories", "generate"));
        for (val step : new String[] { "01", "02", "03", "04" }) {
            notEmpty(
                folder.resolve(
                    "views-stories/migration/" + step + "-overview/plantuml/application/step_" + step + ".puml"
                )
            );
        }
        assertTrue(
            read(folder.resolve("views-stories/migration/02-overview/plantuml/application/step_02.puml")).contains(
                "<<contains-changes>>"
            )
        );
    }

    @Test
    void aMapIsDrawn(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(BRIGHTCART, dir, "brightcart");
        succeeded(
            launcher.launch(
                "-w",
                workspace(folder),
                "stories",
                "generate",
                "--plateau",
                "marketplace",
                "-s",
                "seller_journey"
            )
        );
        notEmpty(folder.resolve("views-stories/seller_journey/02-cloud_map/plantuml/technology/cloud_map.puml"));
    }

    @Test
    @SneakyThrows
    void aNameThePlateauLacksIsAWarningAndTheExitCodeIsZero(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(BRIGHTCART, dir, "brightcart");
        Files.writeString(folder.resolve("shared/story.lacking.yaml"), LACKING);
        val result = succeeded(
            launcher.launch("-w", workspace(folder), "stories", "generate", "--plateau", "saas", "-s", "lacking")
        );
        assertTrue(
            result
                .getErrorOutput()
                .contains(
                    "warning: skip lacking/1: it names `commerce-saas`, which the plateau `inhouse` does not have"
                ),
            () -> said(result)
        );
        assertFalse(Files.exists(folder.resolve("views-stories/lacking/01-overview")));
        notEmpty(folder.resolve("views-stories/lacking/02-overview/plantuml/application/step_02.puml"));
    }

    @Test
    void anUnknownStoryIsOneErrorLine(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(BRIGHTCART, dir, "brightcart");
        val result = launcher.launch("-w", workspace(folder), "stories", "generate", "--plateau", "saas", "-s", "nope");
        assertEquals(1, result.exitCode(), () -> said(result));
        assertEquals(
            1,
            result
                .getErrorOutput()
                .lines()
                .filter(line -> line.startsWith("error:"))
                .count(),
            () -> said(result)
        );
        assertTrue(result.getErrorOutput().contains("error: no story `nope` in the workspace"), () -> said(result));
        assertFalse(Files.exists(folder.resolve("views-stories")));
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }
}

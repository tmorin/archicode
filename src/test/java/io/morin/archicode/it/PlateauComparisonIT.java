package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.BOOKSHOP;
import static io.morin.archicode.it.Shipped.BRIGHTCART;
import static io.morin.archicode.it.Shipped.EXAMPLES;
import static io.morin.archicode.it.Shipped.hasLine;
import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
 * The comparison of two plateaus by the packaged application: {@code diff}, {@code diff --fail-on} (exit codes 0 and 3 and
 * the one {@code error:} line), {@code views generate --against} and {@code --only-changes}, on the manual's example of the
 * plateaus ({@code domain_plateaus}: {@code baseline}, overridden by {@code to-be}) and on the layered Brightcart fixture
 * (four plateaus, a tree that forks, {@code replaces}, a {@code REMOVE} and facets).
 */
@QuarkusMainIntegrationTest
class PlateauComparisonIT {

    @TempDir
    Path dir;

    private Path plateaus() {
        return Shipped.copy(EXAMPLES.resolve("domain_plateaus"), dir, "plateaus");
    }

    private Path brightcart() {
        return Shipped.copy(BRIGHTCART, dir, "brightcart");
    }

    @Test
    void diffComparesWithThePlateauItOverrides(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("-w", workspace(plateaus()), "diff"));
        hasLine("^comparing ", result.getOutput(), result);
    }

    @Test
    void diffFailOnExitsThreeOnAChangeOfAListedState(QuarkusMainLauncher launcher) {
        val result = launcher.launch("-w", workspace(plateaus()), "diff", "--fail-on", "moved,removed");
        assertEquals(3, result.exitCode(), () -> said(result));
        hasLine("^comparing ", result.getOutput(), result);
    }

    @Test
    void diffFailOnExitsZeroWhenNoListedStateChanged(QuarkusMainLauncher launcher) {
        // the invented bookshop of the unit tests holds new, changed and removed rows and no moved, split or merged one:
        // the table is printed as without the option and the build passes
        val folder = Shipped.copy(BOOKSHOP, dir, "bookshop");
        val result = launcher.launch(
            "-w",
            workspace(folder),
            "diff",
            "--plateau",
            "to-be",
            "--fail-on",
            "moved,split,merged"
        );
        assertEquals(0, result.exitCode(), () -> said(result));
        hasLine("^comparing ", result.getOutput(), result);
    }

    @Test
    void diffWidthWrapsTheTextTableAndKeepsTheLinesWithinIt(QuarkusMainLauncher launcher) {
        val folder = Shipped.copy(BOOKSHOP, dir, "bookshop");
        val whole = succeeded(launcher.launch("-w", workspace(folder), "diff", "--plateau", "to-be"));
        val wrapped = succeeded(
            launcher.launch("-w", workspace(folder), "diff", "--plateau", "to-be", "--width", "50")
        );
        val longest = Shipped.payload(whole).lines().mapToInt(String::length).max().orElse(0);
        assertTrue(longest > 50, () -> "the table is " + longest + " columns wide, nothing to wrap\n" + said(whole));
        assertTrue(
            Shipped.payload(wrapped)
                .lines()
                .allMatch(line -> line.length() <= 50),
            () -> "a line is wider than 50 columns\n" + said(wrapped)
        );
        hasLine("^comparing ", wrapped.getOutput(), wrapped);
        hasLine("^CHANGE  *THING  *LAYER  *REFERENCE", wrapped.getOutput(), wrapped);
    }

    @Test
    void diffWidthRefusesAWidthThatIsNotAboveZeroWithOneErrorLine(QuarkusMainLauncher launcher) {
        val result = launcher.launch("-w", workspace(plateaus()), "diff", "--width", "0");
        assertEquals(1, result.exitCode(), () -> said(result));
        hasLine("^error: `--width` must be a whole number", result.getErrorOutput(), result);
        assertTrue(!result.getErrorOutput().contains("\tat "), () -> "a stack trace\n" + said(result));
    }

    @Test
    void diffFailOnRefusesAnUnknownStateWithOneErrorLine(QuarkusMainLauncher launcher) {
        val result = launcher.launch("-w", workspace(plateaus()), "diff", "--fail-on", "nothing");
        assertEquals(1, result.exitCode(), () -> said(result));
        hasLine("^error: ", result.getErrorOutput(), result);
        assertTrue(!result.getErrorOutput().contains("\tat "), () -> "a stack trace\n" + said(result));
    }

    @Test
    void viewsGenerateAgainstWritesTheViewsAndTheTable(QuarkusMainLauncher launcher) {
        val folder = plateaus();
        succeeded(
            launcher.launch("-w", workspace(folder), "views", "generate", "-o", "views", "--against", "baseline")
        );
        notEmpty(folder.resolve("views-to-be-vs-baseline/gap.md"));
        notEmpty(folder.resolve("views-to-be-vs-baseline/gap.json"));
        notEmpty(folder.resolve("views-to-be-vs-baseline/plantuml/application/customer-overview.puml"));
    }

    @Test
    void viewsGenerateOnlyChangesDrawsLess(QuarkusMainLauncher launcher) {
        val folder = plateaus();
        succeeded(
            launcher.launch("-w", workspace(folder), "views", "generate", "-o", "views", "--against", "baseline")
        );
        succeeded(
            launcher.launch(
                "-w",
                workspace(folder),
                "views",
                "generate",
                "-o",
                "changes",
                "--against",
                "baseline",
                "--only-changes"
            )
        );
        val whole = folder.resolve("views-to-be-vs-baseline/plantuml/application/customer-overview.puml");
        val changes = folder.resolve("changes-to-be-vs-baseline/plantuml/application/customer-overview.puml");
        notEmpty(changes);
        assertTrue(
            size(changes) < size(whole),
            () -> "--only-changes draws " + size(changes) + " bytes, the whole " + size(whole)
        );
    }

    @Test
    void brightcartListsItsPlateaus(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("-w", workspace(brightcart()), "plateau", "list"));
        hasLine("^marketplace  *inhouse", result.getOutput(), result);
    }

    @Test
    void brightcartDiffSaysWhatReplacesWhat(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("-w", workspace(brightcart()), "diff", "--plateau", "inhouse"));
        hasLine("^replacing ", result.getOutput(), result);
    }

    @Test
    void brightcartDiffAgainstASibling(QuarkusMainLauncher launcher) {
        val result = succeeded(
            launcher.launch("-w", workspace(brightcart()), "diff", "--plateau", "inhouse", "--against", "saas")
        );
        hasLine("^comparing inhouse .* with saas", result.getOutput(), result);
    }

    @Test
    void brightcartViewsGenerateWritesThePlateauItsComparisonItsCascadeAndItsFacet(QuarkusMainLauncher launcher) {
        val folder = brightcart();
        succeeded(launcher.launch("-w", workspace(folder), "views", "generate", "--plateau", "saas"));
        notEmpty(folder.resolve("views-saas/plantuml/application/shop-overview.puml"));
        notEmpty(folder.resolve("views-saas-vs-baseline/gap.json"));
        assertTrue(
            read(folder.resolve("views-saas-vs-baseline/gap.json")).contains("\"cascade\""),
            "the cascade of a REMOVE is not listed"
        );
        notEmpty(folder.resolve("views-saas-journey/plantuml/application/shop-overview.puml"));
    }

    @SneakyThrows
    private static long size(Path file) {
        return Files.size(file);
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }
}

package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.BRIGHTCART;
import static io.morin.archicode.it.Shipped.copy;
import static io.morin.archicode.it.Shipped.payload;
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
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@code archicode plateau fold [--dry-run]} by the packaged application (wave 028, runs 0207 and 0208, #65): the report on the
 * standard output, the refusals as one {@code error:} line with exit 1 and the folder the same afterwards, hidden files included,
 * and the fold written on a copy of the layered Brightcart.
 */
@QuarkusMainIntegrationTest
class PlateauFoldIT {

    @TempDir
    Path dir;

    @SneakyThrows
    private static String snapshot(Path root) {
        try (Stream<Path> files = Files.walk(root)) {
            return files
                .filter(Files::isRegularFile)
                .sorted()
                .map(f -> root.relativize(f) + "=" + read(f))
                .collect(Collectors.joining("\n"));
        }
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    @Test
    @SneakyThrows
    void theDryRunSaysItsPlanAndTheRefusalsAreOneLineAndNothingIsWritten(QuarkusMainLauncher launcher) {
        val folder = copy(BRIGHTCART, dir, "brightcart");
        Files.writeString(folder.resolve(".hidden"), "kept");
        val before = snapshot(folder);

        // the layered Brightcart: stories name `inhouse`, so the fold is refused with the steps that name it
        val refused = launcher.launch("-w", workspace(folder), "plateau", "fold", "inhouse", "--dry-run");
        assertEquals(1, refused.exitCode(), () -> said(refused));
        val error = refused.getErrorOutput().strip();
        assertTrue(error.startsWith("error: the plateau `inhouse` is named by the story"), () -> said(refused));
        assertEquals(1, error.lines().count(), () -> said(refused));

        val leaf = launcher.launch("-w", workspace(folder), "plateau", "fold", "baseline", "--dry-run");
        assertEquals(1, leaf.exitCode(), () -> said(leaf));

        assertEquals(before, snapshot(folder));
    }

    @Test
    @SneakyThrows
    void theReportIsPrintedAndTheFolderIsTheSame(QuarkusMainLauncher launcher) {
        val folder = copy(BRIGHTCART, dir, "brightcart");
        replaceStories(folder);
        Files.writeString(folder.resolve(".hidden"), "kept");
        val before = snapshot(folder);

        val plan = succeeded(launcher.launch("-w", workspace(folder), "plateau", "fold", "inhouse", "--dry-run"));
        val out = payload(plan);
        assertTrue(out.startsWith("plateau fold inhouse into marketplace (dry run: nothing was written)"), () ->
            said(plan)
        );
        assertTrue(out.contains("files deleted:"), () -> said(plan));
        assertEquals(before, snapshot(folder));
    }

    @SneakyThrows
    private static void replaceStories(Path folder) {
        // the two stories that name `inhouse` are given steps that do not
        for (val story : new String[] { "fork_tour", "seller_journey" }) {
            Files.writeString(
                folder.resolve("shared/story." + story + ".yaml"),
                "header:\n  kind: \"archicode.morin.io/story\"\n  version: \"1\"\ncontent:\n  id: \"" +
                    story +
                    "\"\n  name: \"" +
                    story +
                    "\"\n  steps:\n    - view: \"shop_overview\"\n      text: \"No plateau but the root.\"\n      at: \"baseline\"\n"
            );
        }
    }

    @Test
    @SneakyThrows
    void theFoldIsWrittenAndTheWorkspaceStillOpens(QuarkusMainLauncher launcher) {
        val folder = copy(BRIGHTCART, dir, "brightcart");
        replaceStories(folder);

        val folded = succeeded(launcher.launch("-w", workspace(folder), "plateau", "fold", "inhouse"));
        assertTrue(payload(folded).startsWith("plateau fold inhouse into marketplace (written)"), () -> said(folded));
        assertFalse(Files.exists(folder.resolve("inhouse/plateau.yaml")));

        val list = succeeded(launcher.launch("-w", workspace(folder), "plateau", "list"));
        assertFalse(payload(list).contains("inhouse"), () -> said(list));
        succeeded(launcher.launch("-w", workspace(folder), "views", "generate", "--plateau", "marketplace"));

        val again = snapshot(folder);
        val second = launcher.launch("-w", workspace(folder), "plateau", "fold", "inhouse");
        assertEquals(1, second.exitCode(), () -> said(second));
        val error = second.getErrorOutput().strip();
        assertTrue(error.startsWith("error: unknown plateau `inhouse`"), () -> said(second));
        assertEquals(1, error.lines().count(), () -> said(second));
        assertEquals("", payload(second));
        assertEquals(again, snapshot(folder));
    }
}

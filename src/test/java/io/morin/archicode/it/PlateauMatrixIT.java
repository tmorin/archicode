package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.BRIGHTCART;
import static io.morin.archicode.it.Shipped.hasLine;
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
 * The matrix of a path of plateaus by the packaged application, on a copy of the layered Brightcart: the table on standard
 * output, the two files of {@code -o}, and the refusal of two siblings as one {@code error:} line.
 */
@QuarkusMainIntegrationTest
class PlateauMatrixIT {

    @TempDir
    Path dir;

    private Path brightcart() {
        return Shipped.copy(BRIGHTCART, dir, "brightcart");
    }

    @Test
    void matrixPrintsTheTableOfAPath(QuarkusMainLauncher launcher) {
        val result = succeeded(
            launcher.launch("-w", workspace(brightcart()), "plateau", "matrix", "baseline", "inhouse", "marketplace")
        );
        hasLine("^matrix of baseline, inhouse, marketplace", result.getOutput(), result);
        hasLine("SPAN", result.getOutput(), result);
        hasLine("rows without a change are left out", result.getOutput(), result);
    }

    @Test
    void matrixDerivesThePathFromThePlateau(QuarkusMainLauncher launcher) {
        val result = succeeded(
            launcher.launch("-w", workspace(brightcart()), "plateau", "matrix", "--plateau", "saas")
        );
        hasLine("^matrix of baseline, saas", result.getOutput(), result);
    }

    @Test
    void matrixOutputWritesTheTwoFiles(QuarkusMainLauncher launcher) {
        val folder = brightcart();
        val result = succeeded(
            launcher.launch("-w", workspace(folder), "plateau", "matrix", "baseline", "inhouse", "-o", "views")
        );
        hasLine("^wrote ", result.getOutput(), result);
        val written = folder.resolve("views-matrix-baseline-to-inhouse");
        notEmpty(written.resolve("matrix.md"));
        notEmpty(written.resolve("matrix.json"));
        assertTrue(read(written.resolve("matrix.json")).trim().startsWith("{"), "matrix.json is not an object");
    }

    @Test
    void matrixRefusesTwoSiblingsWithOneErrorLine(QuarkusMainLauncher launcher) {
        val folder = brightcart();
        val result = launcher.launch(
            "-w",
            workspace(folder),
            "plateau",
            "matrix",
            "baseline",
            "inhouse",
            "saas",
            "-o",
            "views"
        );
        assertEquals(1, result.exitCode(), () -> said(result));
        hasLine("^error: .*not on one chain", result.getErrorOutput(), result);
        assertEquals(
            1,
            result
                .getErrorOutput()
                .lines()
                .filter(line -> line.startsWith("error:"))
                .count(),
            () -> "more than one error line\n" + said(result)
        );
        assertFalse(result.getErrorOutput().contains("\tat "), () -> "a stack trace\n" + said(result));
        assertFalse(Files.exists(folder.resolve("views-matrix-baseline-to-saas")), "a folder is written");
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }
}

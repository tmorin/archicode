package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode diff --width}: the text table wrapped to a number of columns, and the text as it always was without the
 * option (#26, W-9 of wave 016). Through the real picocli command line, on an invented pair of plateaus written into a
 * temporary folder (nothing of it is shipped): a distribution network whose elements are nested three levels deep under
 * identifiers that say what they do, so that the references are two hundred characters long, and a table with every kind
 * of row, a cascade of removals and a description that was reworded.
 */
@QuarkusTest
class DiffWidthTest {

    static final String SYSTEM = "inventory-and-replenishment-planning-service-of-the-regional-distribution-network";
    static final String PIPELINE = "goods-in-reception-and-quality-control-processing-pipeline-runtime";
    static final String WORKER = "pallet-label-printing-and-barcode-reconciliation-worker-module";
    static final String REPORTER = "weekly-stock-discrepancy-reporting-and-notification-component";
    static final String REFERENCE = SYSTEM + "." + PIPELINE + "." + WORKER;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private static String manifest(String kind, String header, String content) {
        return (
            "header:\n  kind: \"archicode.morin.io/" + kind + "\"\n  version: \"1\"\n" + header + "content:\n" + content
        );
    }

    /** The workspace: a root of one system, and the plateau {@code later} that changes, adds and removes under it. */
    @SneakyThrows
    private Path workspace() {
        val files = Map.of(
            ".archicode.yaml",
            "settings:\n  name: \"Network\"\n  manifests:\n    paths: [\"manifests/**\"]\n",
            "manifests/system.yaml",
            manifest(
                "system",
                "",
                """
                  id: "%s"
                  name: "Inventory planning"
                  elements:
                    - kind: "container"
                      id: "%s"
                      name: "Goods-in pipeline"
                      elements:
                        - kind: "component"
                          id: "%s"
                          name: "Pallet label worker"
                          description: "Prints the labels."
                          relationships:
                            - destination: "%s.%s.%s"
                              label: "reports to"
                        - kind: "component"
                          id: "%s"
                          name: "Weekly discrepancy reporter"
                """.formatted(SYSTEM, PIPELINE, WORKER, SYSTEM, PIPELINE, REPORTER, REPORTER)
            ),
            "manifests/later/plateau.yaml",
            manifest(
                "plateau",
                "",
                """
                  id: "later"
                  name: "Later"
                  patches:
                    - operator: SET
                      target: "%s"
                      field: description
                      value: "Prints the labels of the pallets and reconciles their barcodes with the stock of the warehouse."
                    - operator: REMOVE
                      target: "%s.%s.%s"
                """.formatted(REFERENCE, SYSTEM, PIPELINE, REPORTER)
            ),
            "manifests/later/dispatch.yaml",
            manifest(
                "container",
                "  plateau: \"later\"\n  parent: \"" + SYSTEM + "\"\n",
                """
                  id: "outbound-dispatch-and-carrier-hand-over-processing-pipeline-runtime"
                  name: "Dispatch pipeline"
                  relationships:
                    - destination: "%s"
                      label: "reads the labels printed by"
                """.formatted(REFERENCE)
            )
        );
        for (val entry : files.entrySet()) {
            val file = dir.resolve(entry.getKey());
            Files.createDirectories(file.getParent());
            Files.writeString(file, entry.getValue());
        }
        return dir.resolve(".archicode.yaml");
    }

    private CliHarness.Result diff(Path workspace, String... args) {
        val all = new ArrayList<String>(List.of("-w", workspace.toString(), "diff", "--plateau", "later"));
        all.addAll(List.of(args));
        return CliHarness.run(factory, errorOutput, all.toArray(String[]::new));
    }

    private static int longest(String text) {
        return text.lines().mapToInt(String::length).max().orElse(0);
    }

    @Test
    void withoutTheOptionTheTableIsAsWideAsItsLongestReference() {
        val result = diff(workspace());
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().contains(REFERENCE + "  "), result.out());
        assertTrue(longest(result.out()) > 200, result.out());
    }

    @Test
    void aWidthAsWideAsTheTableChangesNothing() {
        val workspace = workspace();
        val without = diff(workspace);
        assertEquals(without.out(), diff(workspace, "--width", String.valueOf(longest(without.out()))).out());
        assertEquals(without.out(), diff(workspace, "--width", "10000").out());
        assertEquals(without.err(), diff(workspace, "--width", "10000").err());
    }

    @Test
    void theTableIsWrappedToTheWidthAndLosesNothing() {
        val workspace = workspace();
        val without = diff(workspace).out();
        for (val width : List.of(100, 80, 60, 40)) {
            val result = diff(workspace, "--width", String.valueOf(width));
            assertEquals(0, result.exit(), result.err());
            if (width >= 60) {
                // below that the headings alone are wider than the width: nothing is cut off, the lines are longer
                assertTrue(longest(result.out()) <= width, width + "\n" + result.out());
            }
            assertNotEquals(without, result.out());
            assertEquals(
                without
                    .lines()
                    .filter(line -> line.matches("(elements|relationships) +\\+.*"))
                    .toList(),
                result
                    .out()
                    .lines()
                    .filter(line -> line.matches("(elements|relationships) +\\+.*"))
                    .toList(),
                "the counts are not wrapped"
            );
            // the reference column, read back from the lines of the table: the reference as it was
            val lines = result.out().lines().toList();
            val header = lines
                .stream()
                .filter(line -> line.startsWith("CHANGE"))
                .findFirst()
                .orElseThrow();
            val from = header.indexOf("REFERENCE");
            val to = header.indexOf("NATURES");
            val column = new StringBuilder();
            for (val line : lines.subList(lines.indexOf(header) + 1, lines.size())) {
                if (line.isBlank()) {
                    break;
                }
                column.append(line.substring(Math.min(from, line.length()), Math.min(to, line.length())).strip());
            }
            assertTrue(column.toString().contains(REFERENCE), width + "\n" + column + "\n" + result.out());
        }
    }

    @Test
    void theTableAtOneHundredAndTwentyColumns() {
        val result = diff(workspace(), "--width", "120");
        assertEquals(0, result.exit(), result.err());
        // the counts are as they were, the headings and the first row: a reference cut after its dots, then after the hyphens of its
        // identifiers; the cells that have spaces wrap at them
        val expected = """
        comparing later (Later) with baseline
        elements      +1 ~1 -1
        relationships +1 ~0 -1
        wording only  0 of the 1 changed elements

        CHANGE   THING         LAYER        REFERENCE                    NATURES                      DETAILS
        changed  element       application  inventory-and-               description,                 description: "Prints the
                                            replenishment-planning-      relationships-removed        labels." -> "Prints the
                                            service-of-the-regional-                                  labels of the pallets and
                                            distribution-network.                                     reconciles their bar..."
                                            goods-in-reception-and-
                                            quality-control-processing-
                                            pipeline-runtime.
                                            pallet-label-printing-and-
                                            barcode-reconciliation-
                                            worker-module
        removed  element       application  inventory-and-               -                            name: "Weekly discrepancy
        """;
        assertTrue(result.out().startsWith(expected), result.out());
        // the sentence above the table of the cascade is wrapped too
        assertTrue(
            result
                .out()
                .contains(
                    "cascade of the removals (what a REMOVE took besides the elements it selects, in the plateaus the target adds to the one\nit is compared with)\n"
                ),
            result.out()
        );
    }

    @Test
    void markdownAndJsonAreNotWrapped() {
        val workspace = workspace();
        for (val format : List.of("markdown", "json")) {
            val without = diff(workspace, "-f", format);
            val wrapped = diff(workspace, "-f", format, "--width", "40");
            assertEquals(0, wrapped.exit(), wrapped.err());
            assertEquals(without.out(), wrapped.out(), format);
            assertTrue(wrapped.out().contains(REFERENCE), format);
        }
    }

    @Test
    void failOnAndWidthTogether() {
        val result = diff(workspace(), "--width", "80", "--fail-on", "removed");
        assertEquals(ErrorOutput.CHANGES_FOUND, result.exit(), result.err());
        assertTrue(longest(result.out()) <= 80, result.out());
    }

    @Test
    void aWidthThatIsNotAWholeNumberAboveZeroIsOneErrorLineBeforeAnythingIsLoaded() {
        // the workspace file does not exist: the error is the width, so it was checked first
        val missing = dir.resolve("nothing/.archicode.yaml");
        for (val width : List.of("0", "-5", "abc", "", "1.5", "99999999999", "wide")) {
            val result = diff(missing, "--width", width);
            assertEquals(1, result.exit(), width + "\n" + result.err());
            assertEquals("", result.out(), width);
            assertEquals(1, result.err().lines().count(), width + "\n" + result.err());
            assertTrue(
                result.err().startsWith("error: `--width` must be a whole number of columns above zero"),
                result.err()
            );
            assertTrue(result.err().contains("`" + width + "`"), result.err());
            assertFalse(result.err().contains("\tat "), result.err());
        }
    }
}

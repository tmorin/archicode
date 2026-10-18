package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * {@code archicode diff} on Brightcart (wave 012, run 0061), against the answers the generator wrote in
 * {@code src/test/resources/brightcart/expected/}: the counts of the comparisons the current tool can say (P1, P2, P3,
 * P5 and P6; P4 is the model's alone), the table of changes element by element and relationship by relationship, the
 * notable cases N1 to N17 that the table can show, and the warnings about {@code replaces} that P5 and P6 print. The
 * node test {@code brightcart-kernel.test.js} asks the same of the kernel, the editor test of the Changes panel.
 *
 * <p>Nothing is typed from the document here: a count or a state is read from the files, so a change to the fixture, or
 * to what the tool says of it, fails the test that reads it.
 */
@QuarkusTest
class BrightcartDiffTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    static Path dir;

    private static Path workspace;

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    @BeforeAll
    static void copy() {
        workspace = Brightcart.copyFolders(dir);
    }

    /** The JSON of {@code diff} for a comparison, asked once: the fixture is read only. */
    private JsonNode json(JsonNode comparison) {
        return JSON.computeIfAbsent(comparison.get("id").asText(), id -> {
            val result = cli().diff(workspace, comparison, "json");
            assertEquals(0, result.exit(), result.err());
            return readTree(result.out());
        });
    }

    private static final Map<String, JsonNode> JSON = new TreeMap<>();

    @SneakyThrows
    private static JsonNode readTree(String json) {
        return Brightcart.MAPPER.readTree(json);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#verifiedIds")
    void theCountsAreTheOnesOfTheDocument(String id) {
        val comparison = Brightcart.comparison(id);
        val counts = json(comparison).get("counts");
        val elements = counts.get("elements");
        for (val state : List.of("new", "changed", "removed")) {
            assertEquals(comparison.at("/elements/" + state).asInt(), elements.get(state).asInt(), id + " " + state);
        }
        // moved, split and merged are in the counts only when there is one
        for (val state : List.of("moved", "split", "merged")) {
            assertEquals(comparison.at("/replacing/" + state).asInt(), elements.path(state).asInt(0), id + " " + state);
        }
        for (val state : List.of("new", "changed", "removed")) {
            assertEquals(
                comparison.at("/relationships/" + state).asInt(),
                counts.at("/relationships/" + state).asInt(),
                id + " relationships " + state
            );
        }
        assertEquals(comparison.get("chain").get(0).asText(), json(comparison).at("/baseline/id").asText());
        assertEquals(comparison.get("chain").get(1).asText(), json(comparison).at("/plateau/id").asText());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#verifiedIds")
    void theTextSaysTheCountsInTheWordsOfTheDocument(String id) {
        val comparison = Brightcart.comparison(id);
        val out = cli().diff(workspace, comparison, "text").out();
        val lines = out.lines().toList();
        assertTrue(
            lines.get(0).startsWith("comparing " + comparison.get("chain").get(1).asText() + " ("),
            lines.get(0)
        );
        assertEquals("elements      " + Brightcart.triple(comparison.get("elements")), lines.get(1));
        val replacing = comparison.get("replacing");
        val moves = replacing.get("moved").asInt() + replacing.get("split").asInt() + replacing.get("merged").asInt();
        var next = 2;
        if (moves > 0) {
            assertEquals(
                "replacing     %d moved, %d split, %d merged".formatted(
                    replacing.get("moved").asInt(),
                    replacing.get("split").asInt(),
                    replacing.get("merged").asInt()
                ),
                lines.get(next++)
            );
        }
        assertEquals("relationships " + Brightcart.triple(comparison.get("relationships")), lines.get(next));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#verifiedIds")
    void theToolWarnsAboutEveryReplacesItIgnoresAndAboutNothingElse(String id) {
        val comparison = Brightcart.comparison(id);
        val result = cli().diff(workspace, comparison, "json");
        val warnings = result
            .err()
            .lines()
            .filter(l -> l.startsWith("warning: "))
            .toList();
        assertEquals(comparison.get("ignoredReplaces").asInt(), warnings.size(), result.err());
        assertTrue(
            warnings
                .stream()
                .allMatch(w ->
                    w.matches(
                        "warning: replaces of \\S+ \\(\\w+ layer\\): \\S+ is not an element of the base plateau, ignored"
                    )
                ),
            result.err()
        );
        assertEquals(warnings.size(), result.err().lines().count(), "nothing but those warnings: " + result.err());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#verifiedIds")
    void theTableOfChangesIsTheOneInExpectedChanges(String id) {
        val got = json(Brightcart.comparison(id)).get("changes");
        assertEquals(Brightcart.expectedElementRows(id), Brightcart.elementRows(got), id + " elements");
        assertEquals(Brightcart.expectedRelationshipRows(id), Brightcart.relationshipRows(got), id + " relationships");
    }

    @Test
    void theNotableCasesTheTableCanShowHoldInTheTool() {
        val tables = new TreeMap<String, JsonNode>();
        val checked = new TreeSet<String>();
        for (val notable : Brightcart.expected("notable-cases")) {
            for (val check : notable.get("checks")) {
                val comparison = Brightcart.comparison(check.get("in").asText());
                if (!comparison.get("verified").asText().equals("archicode diff")) {
                    continue; // P4: the model's alone
                }
                if (check.get("state").asText().equals("contains-changes")) {
                    continue; // a state of the drawing: see theBoxesThatContainChangesAreDrawnAsSuch
                }
                val changes = tables.computeIfAbsent(comparison.get("id").asText(), k ->
                    json(comparison).get("changes")
                );
                assertEquals(
                    check.get("state").asText(),
                    Brightcart.stateOf(changes, check),
                    notable.get("id").asText() + " in " + check.get("in").asText() + ": " + check
                );
                checked.add(notable.get("id").asText());
            }
        }
        // every case N1 to N16 has at least one check the table can answer, except N13 (drawn) and N17 (a variant that no tool runs)
        val all = new TreeSet<String>();
        Brightcart.expected("notable-cases").forEach(n -> all.add(n.get("id").asText()));
        val missing = new TreeSet<>(all);
        missing.removeAll(checked);
        assertEquals(new TreeSet<>(List.of("N13", "N17")), missing);
    }

    @Test
    void aSplitHasNoComparedRelationshipsAndTheLinkBetweenTwoMergedElementsReadsAsRemoved() {
        val changes = json(Brightcart.comparison("P2")).get("changes");
        for (val part : List.of("orders.placement", "orders.history")) {
            var seen = 0;
            for (val row : changes) {
                if (row.get("thing").asText().equals("relationship") && row.get("reference").asText().equals(part)) {
                    seen++;
                    assertEquals("new", row.get("change").asText(), part + " " + row.get("destination").asText());
                }
            }
            assertTrue(seen > 0, part + " has relationships");
        }
        val selfLink = new ArrayList<String>();
        for (val row : changes) {
            if (
                row.get("thing").asText().equals("relationship") &&
                row.get("reference").asText().equals("accounts.profiles") &&
                row.get("destination").asText().equals("accounts.profiles")
            ) {
                selfLink.add(row.get("change").asText());
            }
        }
        assertEquals(List.of("removed"), selfLink);
    }

    @Test
    void theBaselineOfEachComparisonIsTheOneTheCommandNames() {
        // the `baseline` key of the plateau says what it is compared with (E2): P1, P2 and P3 name none, P5 and P6 do
        for (val id : List.of("P1", "P2", "P3")) {
            assertFalse(Brightcart.comparison(id).get("command").asText().contains("--baseline"), id);
        }
        for (val id : List.of("P5", "P6")) {
            val command = Brightcart.comparison(id).get("command").asText();
            assertTrue(
                command.contains("--baseline " + Brightcart.comparison(id).get("chain").get(0).asText()),
                command
            );
        }
    }

    @Test
    @SneakyThrows
    void diffWritesNothingNextToTheWorkspace() {
        val before = Brightcart.tree(workspace.getParent());
        for (val comparison : Brightcart.verifiedComparisons()) {
            cli().diff(workspace, comparison, "markdown");
        }
        assertEquals(before, Brightcart.tree(workspace.getParent()));
        assertEquals(Map.of(), Brightcart.tree(workspace.getParent().resolve("views")));
    }
}

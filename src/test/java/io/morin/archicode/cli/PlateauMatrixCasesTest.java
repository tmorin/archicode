package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

/**
 * The oracle of {@code archicode plateau matrix}: {@code src/test/resources/brightcart/matrix-cases.json} (written from a run
 * and read by eye, never edited to match the code) holds the rows, the counts and the refusals of the layered Brightcart,
 * and each case is also cross-checked live against {@code archicode diff -f json}: every cell is the state {@code diff}
 * gives the element of that pair, the Span of a row is the state it gives the element for the first and the last plateau,
 * and the counts of the pairs and of the Span are the counts of {@code diff}.
 */
@QuarkusTest
class PlateauMatrixCasesTest {

    private static final Path CASES = Path.of("src/test/resources/brightcart/matrix-cases.json");
    private static final Path WORKSPACE = Path.of("src/test/resources/brightcart/layered/.archicode.yaml");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final List<String> ELEMENT_COUNTS = List.of("new", "changed", "removed", "moved", "split", "merged");
    private static final List<String> RELATIONSHIP_COUNTS = List.of("new", "changed", "removed");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    private CliHarness.Result run(List<String> command) {
        val args = new ArrayList<String>(List.of("-w", WORKSPACE.toAbsolutePath().toString()));
        args.addAll(command);
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    private CliHarness.Result matrix(List<String> ids, String format) {
        val command = new ArrayList<String>(List.of("plateau", "matrix"));
        command.addAll(ids);
        command.addAll(List.of("-f", format));
        return run(command);
    }

    @SneakyThrows
    private static JsonNode cases() {
        return MAPPER.readTree(Files.readString(CASES));
    }

    @SneakyThrows
    private JsonNode diff(String plateau, String against) {
        val result = run(List.of("diff", "--plateau", plateau, "--against", against, "-f", "json"));
        assertEquals(0, result.exit(), result.err());
        return MAPPER.readTree(result.out());
    }

    private static List<String> strings(JsonNode array) {
        val out = new ArrayList<String>();
        array.forEach(n -> out.add(n.asText()));
        return out;
    }

    /** What diff says of each element of a pair: {@code layer\0reference} to its change word; an element it does not list did not change. */
    private static Map<String, String> changes(JsonNode diff) {
        val out = new HashMap<String, String>();
        for (val change : diff.path("changes")) {
            if ("element".equals(change.path("thing").asText())) {
                out.put(
                    change.path("layer").asText() + "\0" + change.path("reference").asText(),
                    change.path("change").asText()
                );
            }
        }
        return out;
    }

    private static Map<String, Integer> counts(JsonNode counts, List<String> words) {
        val out = new HashMap<String, Integer>();
        words.forEach(w -> out.put(w, counts.path(w).asInt(0)));
        return out;
    }

    private static void sameCounts(JsonNode written, JsonNode diffCounts, String what) {
        assertEquals(
            counts(diffCounts.path("elements"), ELEMENT_COUNTS),
            counts(written.path("elements"), ELEMENT_COUNTS),
            what + ": elements"
        );
        assertEquals(
            counts(diffCounts.path("relationships"), RELATIONSHIP_COUNTS),
            counts(written.path("relationships"), RELATIONSHIP_COUNTS),
            what + ": relationships"
        );
    }

    @Test
    void shouldHoldTheThreePathsAndTheRefusals() {
        val cases = cases();
        assertEquals(
            List.of("baseline-inhouse-marketplace", "baseline-saas", "baseline-marketplace-skipping-inhouse"),
            cases.path("cases").findValuesAsText("id")
        );
        assertTrue(cases.path("cases").get(0).path("span").isObject(), "three plateaus have a Span");
        assertTrue(cases.path("cases").get(1).path("span").isNull(), "two plateaus have none");
        assertTrue(cases.path("cases").get(2).path("span").isNull(), "a skipped plateau leaves two columns");
        assertTrue(cases.path("refusals").size() >= 7);
    }

    @Test
    void shouldWriteTheRowsOfEachCase() {
        for (val c : cases().path("cases")) {
            val id = c.path("id").asText();
            val result = matrix(strings(c.path("args")), "json");
            assertEquals(0, result.exit(), id + ": " + result.err());
            val actual = readTree(result.out());
            assertEquals(strings(c.path("path")), strings(actual.path("path")), id);
            assertEquals(c.path("rows").asInt(), actual.path("rows").size(), id + ": rows");
            assertEquals(c.path("unchanged").asInt(), actual.path("unchanged").asInt(), id + ": unchanged");
            assertEquals(c.path("span"), actual.path("span"), id + ": span");
            val expected = c.path("expectRows");
            assertEquals(expected.size(), actual.path("rows").size(), id);
            for (var i = 0; i < expected.size(); i++) {
                val want = expected.get(i);
                val got = actual.path("rows").get(i);
                val at = id + " row " + i + " " + want.path("reference").asText();
                assertEquals(want.path("layer").asText(), got.path("layer").asText(), at);
                assertEquals(want.path("reference").asText(), got.path("reference").asText(), at);
                val states = new ArrayList<String>();
                val from = new ArrayList<List<String>>();
                got.path("cells").forEach(cell -> {
                    states.add(cell.path("state").asText());
                    from.add(strings(cell.path("from")));
                });
                assertEquals(strings(want.path("cells")), states, at);
                if (want.has("from")) {
                    val wanted = new ArrayList<List<String>>();
                    want.path("from").forEach(f -> wanted.add(strings(f)));
                    assertEquals(wanted, from, at + ": from");
                }
                assertEquals(
                    want.path("span").isNull() ? null : want.path("span").asText(),
                    got.path("span").isNull() ? null : got.path("span").path("state").asText(),
                    at + ": span"
                );
            }
        }
    }

    @Test
    void shouldCountThePairsAndTheSpanLikeDiff() {
        for (val c : cases().path("cases")) {
            val id = c.path("id").asText();
            for (val pair : c.path("pairs")) {
                val from = pair.path("from").asText();
                val to = pair.path("to").asText();
                sameCounts(pair.path("counts"), diff(to, from).path("counts"), id + ": " + from + " to " + to);
            }
            if (c.path("span").isObject()) {
                val first = c.path("span").path("from").asText();
                val last = c.path("span").path("to").asText();
                sameCounts(c.path("span").path("counts"), diff(last, first).path("counts"), id + ": the span");
            }
        }
    }

    @Test
    void shouldGiveEveryCellTheStateDiffGivesItsElement() {
        for (val c : cases().path("cases")) {
            val id = c.path("id").asText();
            val ids = strings(c.path("args"));
            val actual = readTree(matrix(ids, "json").out());
            val byPair = new ArrayList<Map<String, String>>();
            for (var i = 1; i < ids.size(); i++) {
                byPair.add(changes(diff(ids.get(i), ids.get(i - 1))));
            }
            val bySpan = ids.size() > 2 ? changes(diff(ids.getLast(), ids.getFirst())) : Map.<String, String>of();
            val spanCounts = new HashMap<String, Integer>();
            for (val row : actual.path("rows")) {
                val layer = row.path("layer").asText();
                val cells = row.path("cells");
                val at = id + " " + row.path("reference").asText();
                for (var i = 1; i < cells.size(); i++) {
                    val cell = cells.get(i);
                    val state = cell.path("state").asText();
                    if ("absent".equals(state)) {
                        continue;
                    }
                    if ("removed".equals(state)) {
                        // the element of the plateau on the left is the one diff says is removed
                        val before = cells
                            .get(i - 1)
                            .path("reference")
                            .asText();
                        assertEquals(
                            "removed",
                            byPair.get(i - 1).get(layer + "\0" + before),
                            at + ": removed " + before
                        );
                        continue;
                    }
                    val given = byPair.get(i - 1).get(layer + "\0" + cell.path("reference").asText());
                    assertEquals(given == null ? "present" : given, state, at + " in " + ids.get(i));
                }
                val span = row.path("span");
                if (ids.size() > 2 && span.isObject()) {
                    val state = span.path("state").asText();
                    val last = cells.get(cells.size() - 1);
                    if (last.has("reference")) {
                        val given = bySpan.get(layer + "\0" + last.path("reference").asText());
                        assertEquals(given == null ? "present" : given, state, at + ": the span");
                    } else {
                        assertEquals("removed", state, at + ": the span");
                    }
                    spanCounts.merge(state, 1, Integer::sum);
                }
            }
            if (ids.size() > 2) {
                // a row is one lineage of the first plateau to the last: its Span states are the counts of diff (a split origin is
                // drawn on a row of each result, so split counts the results as the kernel does)
                val counts = diff(ids.getLast(), ids.getFirst()).path("counts").path("elements");
                for (val word : ELEMENT_COUNTS) {
                    val key = "new".equals(word) ? "new" : word;
                    assertEquals(counts.path(word).asInt(0), spanCounts.getOrDefault(key, 0), id + ": rows of " + word);
                }
            }
        }
    }

    @Test
    void shouldGiveTheSpanOfThePathAgainstBaseline() {
        val c = cases().path("cases").get(0);
        val elements = c.path("span").path("counts").path("elements");
        // the numbers of the run, not of a sentence: +38 ~3 -6, 11 moved, 2 split, 1 merged
        assertEquals(38, elements.path("new").asInt());
        assertEquals(3, elements.path("changed").asInt());
        assertEquals(6, elements.path("removed").asInt());
        assertEquals(11, elements.path("moved").asInt());
        assertEquals(2, elements.path("split").asInt());
        assertEquals(1, elements.path("merged").asInt());
        assertEquals(61, c.path("rows").asInt());
        assertEquals(27, c.path("unchanged").asInt());
    }

    @Test
    void shouldGiveTheSameBytesTwiceInEveryFormat() {
        for (val c : cases().path("cases")) {
            for (val format : List.of("text", "markdown", "json")) {
                val ids = strings(c.path("args"));
                val first = matrix(ids, format);
                assertEquals(0, first.exit(), first.err());
                assertFalse(first.out().isEmpty());
                assertEquals(first.out(), matrix(ids, format).out(), c.path("id").asText() + " " + format);
            }
        }
    }

    @Test
    void shouldRefuseWithOneLineAndWriteNothing() {
        for (val refusal : cases().path("refusals")) {
            val id = refusal.path("id").asText();
            val command = new ArrayList<String>(List.of("plateau", "matrix"));
            command.addAll(strings(refusal.path("args")));
            val result = run(command);
            assertEquals(1, result.exit(), id + ": " + result.err());
            assertEquals("", result.out(), id);
            assertTrue(
                result
                    .err()
                    .lines()
                    .anyMatch(l -> l.equals("error: " + refusal.path("error").asText())),
                id + ": " + result.err()
            );
            assertEquals(
                1,
                result
                    .err()
                    .lines()
                    .filter(l -> l.startsWith("error: "))
                    .count(),
                id
            );
            assertFalse(result.err().contains("\tat "), id + ": no stack trace");
        }
    }

    @SneakyThrows
    private static JsonNode readTree(String json) {
        return MAPPER.readTree(json);
    }
}

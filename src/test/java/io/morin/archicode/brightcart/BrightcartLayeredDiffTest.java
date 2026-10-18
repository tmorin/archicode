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
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * {@code archicode diff} on the layered Brightcart {@code layered/} (wave 014, run 0079): the same four plateaus as
 * {@code folders/}, written as manifests with a {@code plateau:} header and a {@code Kind: Plateau} with its patches, and
 * read by the layered engine. This is the proof of the two mechanisms against each other: for P1, P2, P3 and P5 the
 * counts, the text, the table of changes and the notable cases are the ones {@code BrightcartDiffTest} requires of
 * {@code folders/}, read from the same files of {@code expected/}, and the table is equal to the one {@code folders/} gives.
 *
 * <p>The fixture forks ({@code inhouse} and {@code saas} both override {@code baseline}), so the plateau is always named:
 * without {@code --plateau} the command tells so. P4 (composed) is the model's alone and the layered tool does not compose
 * the {@code replaces} of the steps, which the last test pins as what it prints, with the one element that differs.
 */
@QuarkusTest
class BrightcartLayeredDiffTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    static Path dir;

    @TempDir
    static Path foldersDir;

    private static Path workspace;
    private static Path folders;

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    @BeforeAll
    static void copy() {
        workspace = Brightcart.copyLayered(dir);
        folders = Brightcart.copyFolders(foldersDir);
    }

    /** The JSON of {@code diff} for a comparison, asked once: the fixture is read only. */
    private JsonNode json(JsonNode comparison) {
        return JSON.computeIfAbsent(comparison.get("id").asText(), id -> {
            val result = cli().layeredDiff(workspace, comparison, "json");
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
    @MethodSource("io.morin.archicode.brightcart.Brightcart#layeredIds")
    void theCountsAreTheOnesOfTheDocument(String id) {
        val comparison = Brightcart.comparison(id);
        val counts = json(comparison).get("counts");
        val elements = counts.get("elements");
        for (val state : List.of("new", "changed", "removed")) {
            assertEquals(comparison.at("/elements/" + state).asInt(), elements.get(state).asInt(), id + " " + state);
        }
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
    @MethodSource("io.morin.archicode.brightcart.Brightcart#layeredIds")
    void theTextSaysTheCountsInTheWordsOfTheDocument(String id) {
        val comparison = Brightcart.comparison(id);
        val lines = cli().layeredDiff(workspace, comparison, "text").out().lines().toList();
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
    @MethodSource("io.morin.archicode.brightcart.Brightcart#layeredIds")
    void theTableOfChangesIsTheOneInExpectedChanges(String id) {
        val got = json(Brightcart.comparison(id)).get("changes");
        assertEquals(Brightcart.expectedElementRows(id), Brightcart.elementRows(got), id + " elements");
        assertEquals(Brightcart.expectedRelationshipRows(id), Brightcart.relationshipRows(got), id + " relationships");
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#layeredIds")
    void theTableIsTheOneTheCompleteFoldersGive(String id) {
        val comparison = Brightcart.comparison(id);
        val old = cli().diff(folders, comparison, "json");
        assertEquals(0, old.exit(), old.err());
        val one = readTree(old.out());
        val other = json(comparison);
        assertEquals(one.get("counts"), other.get("counts"), id + " counts");
        assertEquals(one.get("changes"), other.get("changes"), id + " table of changes, row by row");
        assertEquals(one.get("hidden_wording_only"), other.get("hidden_wording_only"), id);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("io.morin.archicode.brightcart.Brightcart#layeredIds")
    void theToolWarnsAboutEveryReplacesItIgnoresAndAboutNothingElse(String id) {
        val comparison = Brightcart.comparison(id);
        val result = cli().layeredDiff(workspace, comparison, "json");
        val warnings = result
            .err()
            .lines()
            .filter(l -> l.startsWith("warning: "))
            .toList();
        // the same warnings the complete folders print: P3 prints none (the `replaces` that `inhouse` wrote are its own history, not a claim of `marketplace`)
        assertEquals(comparison.get("layeredIgnoredReplaces").asInt(), warnings.size(), result.err());
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
                if (comparison.get("layeredCommand").isNull()) {
                    continue; // P6 is what the old mechanism prints for the question of P4
                }
                if (check.get("state").asText().equals("contains-changes")) {
                    continue; // a state of the drawing: see BrightcartLayeredViewsTest
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

    /**
     * N2: the cascade of a {@code REMOVE} is listed beside the table. The {@code REMOVE} of {@code shop.app.catalog} in
     * {@code saas} took, without a patch of their own, the links the console had to the catalog and to the promotions, and
     * the entry of {@code shop.cache} in {@code staging.vm}. Only the removals between the two plateaus are listed: the
     * {@code REMOVE} of {@code inhouse} are not in the comparison of {@code marketplace} with {@code inhouse}, and a
     * comparison with a descendant has none.
     */
    @Test
    void theCascadeOfARemoveIsListedAndOnlyForTheRemovalsBetweenTheTwoPlateaus() {
        val rows = cascade(json(Brightcart.comparison("P1")));
        assertTrue(
            rows.contains(
                "saas|dropped|application|backoffice.console|relationships: shop.app.catalog (maintains products in)"
            ),
            rows.toString()
        );
        assertTrue(
            rows.contains(
                "saas|dropped|application|backoffice.console|relationships: shop.app.promotions (configures promotions in)"
            ),
            rows.toString()
        );
        assertTrue(rows.contains("saas|dropped|technology|staging.vm|applications: shop.cache"), rows.toString());
        // the plateaus the target adds to the one it is compared with, and only those
        assertTrue(rows.stream().allMatch(r -> r.startsWith("saas|")), rows.toString());
        val marketplace = cascade(json(Brightcart.comparison("P3")));
        assertFalse(marketplace.isEmpty());
        assertTrue(marketplace.stream().allMatch(r -> r.startsWith("marketplace|")), marketplace.toString());
        assertTrue(
            marketplace.contains("marketplace|removed|application|shop.web|"),
            "the REMOVE of `shop` took `shop.web`: " + marketplace
        );
        // the text and the Markdown say it in their own section
        for (val format : List.of("text", "markdown")) {
            val out = cli().layeredDiff(workspace, Brightcart.comparison("P1"), format).out();
            assertTrue(out.toLowerCase(java.util.Locale.ROOT).contains("cascade"), format + ": " + out);
        }
        // against a descendant nothing is removed between the two: no cascade
        val future = cli().in(
            workspace,
            List.of("diff", "--plateau", "inhouse", "--against", "marketplace", "-f", "json")
        );
        assertEquals(0, future.exit(), future.err());
        assertEquals(List.of(), cascade(readTree(future.out())).stream().toList());
    }

    /** The layer and reference of each element of a graph, sorted. */
    private static List<String> references(JsonNode graph) {
        val out = new ArrayList<String>();
        graph.get("elements").forEach(e -> out.add(e.get("layer").asText() + "|" + e.get("reference").asText()));
        return out.stream().sorted().toList();
    }

    private static TreeSet<String> cascade(JsonNode diff) {
        val rows = new TreeSet<String>();
        for (val row : diff.path("cascade")) {
            rows.add(
                String.join(
                    "|",
                    row.get("plateau").asText(),
                    row.get("effect").asText(),
                    row.get("layer").asText(),
                    row.get("element").asText(),
                    row.path("detail").asText()
                )
            );
        }
        return rows;
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void theGraphOfAPlateauHasTheElementsAndRelationshipsOfTheDocument(String plateau) {
        val result = cli().in(workspace, List.of("query", "graph", "--plateau", plateau));
        assertEquals(0, result.exit(), result.err());
        val graph = readTree(result.out());
        val want = Brightcart.expected("sizes").at("/plateaus/" + plateau);
        assertEquals(want.get("elements").asInt(), graph.get("elements").size(), plateau + " elements");
        assertEquals(want.get("relationships").asInt(), graph.get("relationships").size(), plateau + " relationships");
        for (val layer : List.of("application", "technology")) {
            var n = 0;
            for (val element : graph.get("elements")) {
                if (element.get("layer").asText().equals(layer)) {
                    n++;
                }
            }
            assertEquals(want.get(layer).asInt(), n, plateau + " " + layer);
        }
        // and the graph is the one of the complete folders: the same elements and the same relationships (the order of the children
        // inside an element is the order of the manifests, which the two renditions do not share)
        val old = cli().in(folders, List.of("query", "graph", "--plateau", plateau));
        assertEquals(0, old.exit(), old.err());
        val oldGraph = readTree(old.out());
        assertEquals(references(oldGraph), references(graph), plateau + " elements, one by one");
        assertEquals(oldGraph.get("relationships"), graph.get("relationships"), plateau + " relationships, one by one");
    }

    /**
     * The layered tool reads the {@code replaces} of every layer of the chain, relative to the plateau it compares with, and
     * does not compose them (L9, P4): {@code discovery.search} replaces {@code commerce.search}, which replaces
     * {@code shop.app.search}, so against {@code baseline} it is new and {@code shop.app.search} is removed. This pins what
     * the tool prints, and the two rows that make the difference with the model's P4; the day it composes (#89), this test is the
     * one to change.
     */
    @Test
    void marketplaceAgainstBaselineIsP4ButForTheMoveThatTookTwoSteps() {
        val p4 = Brightcart.comparison("P4");
        val result = cli().layeredDiff(workspace, p4, "json");
        assertEquals(0, result.exit(), result.err());
        val diff = readTree(result.out());
        val want = p4.get("layeredGives");
        val counts = diff.get("counts");
        val got = List.of(
            counts.at("/elements/new").asInt(),
            counts.at("/elements/changed").asInt(),
            counts.at("/elements/removed").asInt(),
            counts.at("/elements/moved").asInt(),
            counts.at("/elements/split").asInt(),
            counts.at("/elements/merged").asInt(),
            counts.at("/relationships/new").asInt(),
            counts.at("/relationships/changed").asInt(),
            counts.at("/relationships/removed").asInt()
        );
        val wanted = new ArrayList<Integer>();
        want.forEach(n -> wanted.add(n.asInt()));
        assertEquals(wanted, got);
        // the model's P4, row by row: the two that differ
        val differences = new TreeSet<String>();
        val model = new TreeSet<>(Brightcart.expectedElementRows("P4"));
        val tool = new TreeSet<>(Brightcart.elementRows(diff.get("changes")));
        for (val row : tool) {
            if (!model.contains(row)) {
                differences.add("tool " + row);
            }
        }
        for (val row : model) {
            if (!tool.contains(row)) {
                differences.add("model " + row);
            }
        }
        // the model says `discovery.search` is moved (from `shop.app.search`), the tool says new and lists `shop.app.search` as removed
        assertEquals(
            new TreeSet<>(
                List.of(
                    "model application|discovery.search|moved",
                    "tool application|discovery.search|new",
                    "tool application|shop.app.search|removed"
                )
            ),
            differences
        );
        assertEquals(
            p4.get("layeredIgnoredReplaces").asInt(),
            result
                .err()
                .lines()
                .filter(l -> l.startsWith("warning: "))
                .count(),
            result.err()
        );
        assertTrue(result.err().contains("commerce.search is not an element of the base plateau"), result.err());
    }

    @Test
    void theFixtureForksSoThePlateauIsNamed() {
        val result = cli().in(workspace, List.of("diff"));
        assertEquals(1, result.exit());
        assertEquals("", result.out());
        assertEquals(
            "error: the plateaus of this workspace are not one line (`baseline` is overridden by `inhouse`, `saas`): name the plateau to read with `--plateau`, or with `settings.current`\n",
            result.err()
        );
    }

    @Test
    void plateauListSaysEachPlateauItsParentAndWhereItIsWritten() {
        val result = cli().in(workspace, List.of("plateau", "list"));
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
        val rows = result
            .out()
            .lines()
            .map(l -> l.trim().split("\\s{2,}"))
            .toList();
        assertEquals(List.of("PLATEAU", "PARENT", "SOURCE", "NAME", "HORIZON"), List.of(rows.get(0)));
        val byId = new TreeMap<String, String[]>();
        rows.stream()
            .skip(1)
            .forEach(r -> byId.put(r[0], r));
        assertEquals(
            new TreeSet<>(List.of("baseline", "inhouse", "marketplace", "saas")),
            new TreeSet<>(byId.keySet())
        );
        assertEquals("-", byId.get("baseline")[1]);
        assertEquals("baseline", byId.get("saas")[1]);
        assertEquals("baseline", byId.get("inhouse")[1]);
        assertEquals("inhouse", byId.get("marketplace")[1]);
        for (val id : byId.keySet()) {
            assertEquals("manifest " + id + "/plateau.yaml", byId.get(id)[2], id);
            assertTrue(Brightcart.PLATEAUS.contains(id), id);
        }
    }

    @Test
    void diffWritesNothingNextToTheWorkspaceAndTwoRunsGiveTheSameBytes() {
        val before = Brightcart.tree(workspace.getParent());
        for (val id : Brightcart.layeredIds().toList()) {
            val comparison = Brightcart.comparison(id);
            for (val format : List.of("text", "markdown", "json")) {
                val one = cli().layeredDiff(workspace, comparison, format);
                val two = cli().layeredDiff(workspace, comparison, format);
                assertEquals(0, one.exit(), one.err());
                assertEquals(one, two, id + " " + format);
                assertFalse(one.out().isBlank());
            }
        }
        assertEquals(before, Brightcart.tree(workspace.getParent()));
    }
}

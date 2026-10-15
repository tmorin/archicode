package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * What a plateau changes, from the command line: {@code archicode diff} and {@code views generate --baseline}, through
 * the real picocli command line, on the invented bookshop of {@code src/test/resources/plateau-comparison} (three
 * plateaus: {@code as-is}, {@code to-be}, and {@code later}, whose own {@code baseline} is {@code as-is}).
 */
@QuarkusTest
class PlateauComparisonTest {

    private static final Path FIXTURE = Path.of("src/test/resources/plateau-comparison");

    @Inject
    CommandLine.IFactory factory;

    @TempDir
    Path dir;

    @SneakyThrows
    private Path workspace() {
        try (val files = Files.walk(FIXTURE)) {
            for (val source : files.toList()) {
                if (source.getFileName().toString().equals("expected-counts.json")) {
                    continue; // the contract the editor's tests read too, not a file of the workspace
                }
                val target = dir.resolve(FIXTURE.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        return dir.resolve("workspace.yaml");
    }

    private record Result(int exit, String out, String err) {}

    private Result run(String... args) {
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new java.io.PrintWriter(err, true, StandardCharsets.UTF_8));
            commandLine.setExecutionExceptionHandler((e, c, p) -> {
                c.getErr().println(e.getMessage());
                return 1;
            });
            val exit = commandLine.execute(args);
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    private Result diff(Path workspace, String... args) {
        val all = new java.util.ArrayList<String>(List.of("-w", workspace.toString(), "diff"));
        all.addAll(List.of(args));
        return run(all.toArray(String[]::new));
    }

    @SneakyThrows
    private String read(String path) {
        return Files.readString(dir.resolve(path));
    }

    @SneakyThrows
    private List<String> files(String folder) {
        try (val files = Files.walk(dir.resolve(folder))) {
            return files
                .filter(Files::isRegularFile)
                .map(f -> dir.resolve(folder).relativize(f).toString().replace('\\', '/'))
                .sorted()
                .toList();
        }
    }

    // ---- diff

    private static final String TO_BE_AGAINST_AS_IS = """
    comparing to-be (To be) with as-is (As is)
    elements      +3 ~6 -1
    relationships +2 ~1 -2
    wording only  1 of the 6 changed elements

    CHANGE   THING         LAYER        REFERENCE                               NATURES                                      DETAILS
    changed  element       application  customer                                relationships-added
    changed  element       application  shop.api                                relationships-removed,relationships-changed
    changed  element       application  shop.db                                 description (wording only)                   description: (none) -> "Holds the catalog."
    removed  element       application  shop.legacy                             -                                            name: "Legacy batch"
    new      element       application  shop.mobile                             -                                            name: "Mobile app"
    new      element       application  shop.notifications                      -                                            name: "Notifications"
    new      element       application  shop.notifications.sender               -                                            name: "Sender"
    changed  element       application  shop.web                                qualifiers                                   qualifiers: +SPA
    changed  element       application  warehouse.stock                         name                                         name: "Stock" -> "Stock keeping"
    changed  element       technology   prod.cluster                            deployment                                   applications: +shop.notifications -shop.legacy
    new      relationship  application  customer -> shop.mobile (orders on)     -
    changed  relationship  application  shop.api -> shop.db (reads and writes)  label                                        label: "reads" -> "reads and writes"
    removed  relationship  application  shop.api -> shop.legacy (delegates to)  -
    removed  relationship  application  shop.legacy -> shop.db (loads)          -
    new      relationship  application  shop.mobile -> shop.api (calls)         -
    """;

    @Test
    void diffTellsWhatAPlateauChangesAndExitsZero() {
        val result = diff(workspace(), "--plateau", "to-be");
        assertEquals(0, result.exit, result.err);
        assertEquals(TO_BE_AGAINST_AS_IS, result.out);
    }

    @Test
    void theBytesAreTheSameFromOneRunToTheNextInEveryFormat() {
        val workspace = workspace();
        for (val format : List.of("text", "markdown", "json")) {
            val first = diff(workspace, "--plateau", "to-be", "--format", format);
            val second = diff(workspace, "--plateau", "to-be", "-f", format);
            assertEquals(0, first.exit, first.err);
            assertEquals(first.out, second.out, format);
            assertFalse(first.out.contains("\r"), format);
            assertTrue(first.out.endsWith("\n"), format);
        }
    }

    @Test
    void markdownIsATableAReviewerCanPaste() {
        val result = diff(workspace(), "--plateau", "to-be", "--format", "markdown");
        assertEquals(0, result.exit, result.err);
        val lines = result.out.lines().toList();
        assertEquals("# Changes of to-be (To be) compared with as-is (As is)", lines.get(0));
        assertTrue(lines.contains("| elements | 3 | 6 | 1 |"), result.out);
        assertTrue(lines.contains("| relationships | 2 | 1 | 2 |"), result.out);
        assertTrue(lines.contains("Wording only: 1 of the 6 changed elements."), result.out);
        assertTrue(lines.contains("| Change | Thing | Layer | Reference | Natures | Details |"), result.out);
        assertTrue(
            lines.contains("| changed | element | application | shop.web | qualifiers | qualifiers: +SPA |"),
            result.out
        );
        assertTrue(
            lines.contains("| removed | relationship | application | shop.api -> shop.legacy (delegates to) | - |  |"),
            result.out
        );
    }

    @Test
    @SneakyThrows
    void jsonHasTheCountsAndTheRowsOfTheTable() {
        val result = diff(workspace(), "--plateau", "to-be", "--format", "json");
        assertEquals(0, result.exit, result.err);
        val json = new ObjectMapper().readTree(result.out);
        assertEquals("to-be", json.at("/plateau/id").asText());
        assertEquals("As is", json.at("/baseline/name").asText());
        assertEquals(3, json.at("/counts/elements/new").asInt());
        assertEquals(6, json.at("/counts/elements/changed").asInt());
        assertEquals(1, json.at("/counts/elements/removed").asInt());
        assertEquals(1, json.at("/counts/elements/wording_only").asInt());
        assertEquals(2, json.at("/counts/relationships/new").asInt());
        assertEquals(1, json.at("/counts/relationships/changed").asInt());
        assertEquals(2, json.at("/counts/relationships/removed").asInt());
        assertEquals(0, json.get("hidden_wording_only").asInt());
        assertEquals(15, json.get("changes").size());
        val api = rowOf(json, "shop.api");
        assertEquals("changed", api.get("change").asText());
        assertEquals("relationships-removed", api.at("/natures/0").asText());
        val db = rowOf(json, "shop.db");
        assertTrue(db.get("wording_only").asBoolean());
        assertEquals("Holds the catalog.", db.at("/after/description").asText());
        assertTrue(db.at("/before/description").isNull());
        // two spaces, a space after the colon, line feeds only
        assertTrue(result.out.startsWith("{\n  \"plateau\": {\n    \"id\": \"to-be\""), result.out);
    }

    /**
     * The counts and the rows the CLI and the editor must give for the same pair, in one file next to the fixture
     * ({@code expected-counts.json}). The editor's side is {@code cli-editor-counts.test.js}, which loads the same
     * folders and asserts the same file, so that either side drifting fails a test.
     */
    @Test
    @SneakyThrows
    void theCliGivesTheCountsAndTheRowsOfTheFileTheEditorReadsToo() {
        val mapper = new ObjectMapper();
        val expected = mapper.readTree(FIXTURE.resolve("expected-counts.json").toFile());
        val workspace = workspace();
        val result = diff(
            workspace,
            "--plateau",
            expected.get("plateau").asText(),
            "--baseline",
            expected.get("baseline").asText(),
            "--format",
            "json"
        );
        assertEquals(0, result.exit, result.err);
        val json = mapper.readTree(result.out);
        assertEquals(expected.get("counts"), json.get("counts"));
        assertEquals(expected.get("changes").size(), json.get("changes").size());
        for (int i = 0; i < expected.get("changes").size(); i++) {
            val want = expected.get("changes").get(i);
            val got = json.get("changes").get(i);
            assertEquals(want.get("thing"), got.get("thing"), "row " + i);
            assertEquals(want.get("layer"), got.get("layer"), "row " + i);
            assertEquals(want.get("reference"), got.get("reference"), "row " + i);
            assertEquals(want.get("change"), got.get("change"), "row " + i);
            assertEquals(want.get("natures"), got.get("natures"), "row " + i);
            if (want.get("thing").asText().equals("relationship")) {
                assertEquals(want.get("destination"), got.get("destination"), "row " + i);
                assertEquals(want.get("label").asText(), got.path("label").asText(""), "row " + i);
            }
        }
        // what `--no-wording` says it hides is what the editor's toggle hides
        val quiet = mapper.readTree(
            diff(workspace, "--plateau", "to-be", "--baseline", "as-is", "--no-wording", "-f", "json").out
        );
        assertEquals(expected.get("hidden_wording_only"), quiet.get("hidden_wording_only"));
        // the text and the Markdown forms print the same counts
        val c = expected.get("counts");
        val e = c.get("elements");
        val r = c.get("relationships");
        val text = diff(workspace, "--plateau", "to-be", "--baseline", "as-is").out;
        assertTrue(
            text.contains(
                "elements      +%d ~%d -%d".formatted(
                    e.get("new").asInt(),
                    e.get("changed").asInt(),
                    e.get("removed").asInt()
                )
            ),
            text
        );
        assertTrue(
            text.contains(
                "relationships +%d ~%d -%d".formatted(
                    r.get("new").asInt(),
                    r.get("changed").asInt(),
                    r.get("removed").asInt()
                )
            ),
            text
        );
        val markdown = diff(workspace, "--plateau", "to-be", "--baseline", "as-is", "-f", "markdown").out;
        assertTrue(
            markdown.contains(
                "| elements | %d | %d | %d |".formatted(
                    e.get("new").asInt(),
                    e.get("changed").asInt(),
                    e.get("removed").asInt()
                )
            ),
            markdown
        );
    }

    private static JsonNode rowOf(JsonNode json, String reference) {
        for (val row : json.get("changes")) {
            if (row.get("thing").asText().equals("element") && row.get("reference").asText().equals(reference)) {
                return row;
            }
        }
        throw new AssertionError("no row for " + reference);
    }

    @Test
    void noWordingHidesTheWordingOnlyChangesAndSaysHowManyAreHidden() {
        val workspace = workspace();
        val text = diff(workspace, "--plateau", "to-be", "--no-wording");
        assertEquals(0, text.exit, text.err);
        assertFalse(text.out.contains("Holds the catalog"), text.out);
        assertTrue(text.out.contains("1 wording-only change hidden (--no-wording)"), text.out);
        // the counts are the ones of the comparison, wording included
        assertTrue(text.out.contains("elements      +3 ~6 -1"), text.out);
        val markdown = diff(workspace, "--plateau", "to-be", "--no-wording", "-f", "markdown");
        assertFalse(markdown.out.contains("Holds the catalog"), markdown.out);
        assertTrue(markdown.out.contains("1 wording-only change is hidden from the table."), markdown.out);
        val json = diff(workspace, "--plateau", "to-be", "--no-wording", "-f", "json");
        assertTrue(json.out.contains("\"hidden_wording_only\": 1"), json.out);
        assertFalse(json.out.contains("Holds the catalog"), json.out);
    }

    @Test
    void theBaselineOfAPlateauIsTheOneBeforeItUnlessItNamesAnother() {
        val workspace = workspace();
        // `later` has `baseline: as-is`, though `to-be` comes before it; it is also the plateau read by default
        val later = diff(workspace);
        assertEquals(0, later.exit, later.err);
        assertTrue(later.out.startsWith("comparing later with as-is (As is)\n"), later.out);
        assertTrue(later.out.contains("elements      +3 ~6 -2\n"), later.out);
        assertTrue(later.out.contains("warehouse.picking"), later.out);
    }

    @Test
    void theBaselineAskedForWins() {
        val workspace = workspace();
        val result = diff(workspace, "--plateau", "later", "--baseline", "to-be");
        assertEquals(0, result.exit, result.err);
        assertTrue(result.out.startsWith("comparing later with to-be (To be)\n"), result.out);
        assertTrue(result.out.contains("elements      +0 ~0 -1\n"), result.out);
        assertTrue(result.out.contains("warehouse.picking"), result.out);
        // the first plateau can be compared with a later one when asked
        val reverse = diff(workspace, "--plateau", "as-is", "--baseline", "to-be");
        assertEquals(0, reverse.exit, reverse.err);
        assertTrue(reverse.out.contains("elements      +1 ~6 -3\n"), reverse.out);
    }

    @Test
    void aPlateauWithNothingBeforeItAndNoBaselineHasNothingToBeComparedWith() {
        val result = diff(workspace(), "--plateau", "as-is");
        assertEquals(1, result.exit);
        assertTrue(
            result.err.contains("the plateau `as-is` is the first plateau and nothing is before it"),
            result.err
        );
        assertTrue(result.err.contains("`--baseline`"), result.err);
        assertEquals("", result.out);
    }

    @Test
    void anUnknownBaselineFailsWithTheListOfThePlateaus() {
        val workspace = workspace();
        val result = diff(workspace, "--baseline", "nope");
        assertEquals(1, result.exit);
        assertTrue(
            result.err.contains(
                "unknown baseline `nope`: the plateaus of this workspace are `as-is`, `to-be`, `later`"
            ),
            result.err
        );
        val itself = diff(workspace, "--plateau", "to-be", "--baseline", "to-be");
        assertEquals(1, itself.exit);
        assertTrue(itself.err.contains("the baseline `to-be` is the plateau that is compared"), itself.err);
    }

    @Test
    @SneakyThrows
    void aWorkspaceWithoutPlateausHasNothingToBeComparedAndSaysSo() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  name: plain\n");
        val result = diff(dir.resolve("workspace.yaml"));
        assertEquals(1, result.exit);
        assertTrue(
            result.err.contains("the workspace declares no `settings.plateaus`: there is nothing to compare"),
            result.err
        );
        assertEquals("", result.out);
    }

    @Test
    void theFormatMustBeOneOfThree() {
        val result = diff(workspace(), "--plateau", "to-be", "--format", "html");
        assertEquals(2, result.exit);
        assertTrue(result.err.contains("expected one of text, markdown or json but was 'html'"), result.err);
    }

    // ---- views generate

    private Result generate(Path workspace, String... args) {
        val all = new java.util.ArrayList<String>(List.of("-w", workspace.toString(), "views", "generate"));
        all.addAll(List.of(args));
        return run(all.toArray(String[]::new));
    }

    @Test
    void aPlateauHasItsOwnFolderAndNoComparisonUnlessItIsAskedFor() {
        val workspace = workspace();
        val result = generate(workspace, "--plateau", "to-be");
        assertEquals(0, result.exit, result.err);
        assertTrue(Files.isDirectory(dir.resolve("views-to-be/plantuml/application")));
        // the facets keep their template: <views folder>-<facet>
        assertTrue(Files.isDirectory(dir.resolve("views-to-be-no-orders/plantuml")));
        assertTrue(Files.isDirectory(dir.resolve("views-to-be-without-removed/plantuml")));
        assertFalse(Files.exists(dir.resolve("views")));
        // `to-be` has `as-is` before it, which is the baseline of `diff`: a comparison doubles the views and is asked for
        try (val children = Files.list(dir)) {
            assertEquals(
                List.of(
                    "plateaus",
                    "views-to-be",
                    "views-to-be-no-orders",
                    "views-to-be-without-removed",
                    "workspace.yaml"
                ),
                children
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .collect(Collectors.toList())
            );
        } catch (java.io.IOException e) {
            throw new AssertionError(e);
        }
        // and the plain views of a plateau say nothing of changes
        val plain = read("views-to-be/plantuml/application/shop-detailed.puml");
        assertFalse(plain.contains("legend"), plain);
        assertFalse(plain.contains("<<new>>"), plain);
        assertFalse(plain.contains("<U+"), plain);
    }

    @Test
    void theBaselineWritesTheViewsOfThePlateauAndTheViewsOfTheComparison() {
        val workspace = workspace();
        val result = generate(workspace, "--plateau", "to-be", "--baseline", "as-is");
        assertEquals(0, result.exit, result.err);
        assertTrue(Files.isDirectory(dir.resolve("views-to-be/plantuml/application")));
        assertTrue(Files.isDirectory(dir.resolve("views-to-be-vs-as-is/plantuml/application")));
        assertTrue(Files.isDirectory(dir.resolve("views-to-be-vs-as-is/plantuml/technology")));
        // the facets of the comparison: <folder of the comparison>-<facet>
        assertTrue(Files.isDirectory(dir.resolve("views-to-be-vs-as-is-no-orders/plantuml")));
        assertTrue(Files.isDirectory(dir.resolve("views-to-be-vs-as-is-without-removed/plantuml")));
        // what only the baseline had has views in the comparison, and none in the plateau
        assertTrue(Files.exists(dir.resolve("views-to-be-vs-as-is/plantuml/application/shop_legacy-overview.puml")));
        assertFalse(Files.exists(dir.resolve("views-to-be/plantuml/application/shop_legacy-overview.puml")));
        // the table of changes, next to the views of the comparison only
        assertTrue(Files.exists(dir.resolve("views-to-be-vs-as-is/gap.md")));
        assertTrue(Files.exists(dir.resolve("views-to-be-vs-as-is/gap.json")));
        assertFalse(Files.exists(dir.resolve("views-to-be/gap.md")));
        assertFalse(Files.exists(dir.resolve("views-to-be-vs-as-is-no-orders/gap.md")));
        // the same views, and the two files: what the plateau alone has, plus what only the baseline had
        val plain = files("views-to-be");
        val compared = files("views-to-be-vs-as-is");
        assertEquals(plain.size() + 2 + 2, compared.size(), compared.toString());
    }

    @Test
    void generateAndDiffGiveTheSameCounts() {
        val workspace = workspace();
        val generated = generate(workspace, "--plateau", "to-be", "--baseline", "as-is");
        assertEquals(0, generated.exit, generated.err);
        val diff = diff(workspace, "--plateau", "to-be", "--baseline", "as-is", "-f", "json");
        // gap.json is the table of the comparison, wording included: the very report `diff --format json` prints
        assertEquals(diff.out, read("views-to-be-vs-as-is/gap.json"));
        val markdown = diff(workspace, "--plateau", "to-be", "--baseline", "as-is", "-f", "markdown");
        assertEquals(markdown.out, read("views-to-be-vs-as-is/gap.md"));
    }

    @Test
    void aPlateauThatNamesItsBaselineIsComparedWithoutBeingToldTo() {
        val workspace = workspace();
        // `later` is the last plateau: the one read by default, and its `baseline` is `as-is`
        val result = generate(workspace);
        assertEquals(0, result.exit, result.err);
        assertTrue(Files.isDirectory(dir.resolve("views-later/plantuml")));
        assertTrue(Files.isDirectory(dir.resolve("views-later-vs-as-is/plantuml")));
        assertTrue(read("views-later-vs-as-is/gap.md").startsWith("# Changes of later compared with as-is (As is)\n"));
        assertFalse(Files.exists(dir.resolve("views-later-vs-to-be")));
    }

    @Test
    void theOutputOptionIsTheBeginningOfTheNameOfTheFolders() {
        val workspace = workspace();
        val result = generate(workspace, "--plateau", "to-be", "--baseline", "as-is", "-o", "out");
        assertEquals(0, result.exit, result.err);
        assertTrue(Files.isDirectory(dir.resolve("out-to-be/plantuml")));
        assertTrue(Files.isDirectory(dir.resolve("out-to-be-vs-as-is/plantuml")));
        assertTrue(Files.exists(dir.resolve("out-to-be-vs-as-is/gap.json")));
        assertTrue(Files.isDirectory(dir.resolve("out-to-be-vs-as-is-no-orders/plantuml")));
        assertFalse(Files.exists(dir.resolve("views-to-be")));
    }

    @Test
    @SneakyThrows
    void aWorkspaceWithoutPlateausKeepsItsFoldersAndRefusesABaseline() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/shop.yaml"),
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"shop\"\n"
        );
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  name: plain\n");
        val result = generate(dir.resolve("workspace.yaml"));
        assertEquals(0, result.exit, result.err);
        assertTrue(Files.exists(dir.resolve("views/plantuml/application/shop-overview.puml")));
        assertFalse(
            files("views")
                .stream()
                .anyMatch(f -> f.startsWith("gap."))
        );
        try (val children = Files.list(dir)) {
            assertEquals(
                List.of("manifests", "views", "workspace.yaml"),
                children
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .collect(Collectors.toList())
            );
        }
        val refused = generate(dir.resolve("workspace.yaml"), "--baseline", "as-is", "-o", "other");
        assertEquals(1, refused.exit);
        assertTrue(
            refused.err.contains("`--baseline as-is` cannot be used: the workspace declares no `settings.plateaus`"),
            refused.err
        );
        assertFalse(Files.exists(dir.resolve("other")), "nothing is written when the options are refused");
    }

    @Test
    void anUnknownBaselineIsRefusedBeforeAnythingIsWritten() {
        val workspace = workspace();
        val result = generate(workspace, "--plateau", "to-be", "--baseline", "nope");
        assertEquals(1, result.exit);
        assertTrue(result.err.contains("unknown baseline `nope`"), result.err);
        assertFalse(Files.exists(dir.resolve("views-to-be")));
    }

    @Test
    void twoGenerationsOfTheSamePairAreByteIdentical() {
        val workspace = workspace();
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is", "-o", "one").exit);
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is", "-o", "two").exit);
        for (val folder : List.of("to-be-vs-as-is", "to-be-vs-as-is-without-removed", "to-be-vs-as-is-no-orders")) {
            val first = files("one-" + folder);
            assertEquals(first, files("two-" + folder));
            for (val file : first) {
                assertEquals(
                    read("one-" + folder + "/" + file),
                    read("two-" + folder + "/" + file),
                    folder + "/" + file
                );
            }
        }
    }

    // ---- what the views of a comparison say

    @Test
    void theBoxesAndTheLinksTellWhatChangedWithGlyphsAndLines() {
        val workspace = workspace();
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is").exit);
        val puml = read("views-to-be-vs-as-is/plantuml/application/shop-detailed.puml");
        // the state is the first stereotype of the box (PlantUML lets the first win) and the glyph is in its label
        assertTrue(puml.contains("rectangle shop.mobile <<new>> <<container>> <<atomic>> [\n+ Mobile app\n"), puml);
        assertTrue(puml.contains("<<changed>> <<Spring Boot>> <<container>> <<atomic>> [\n<U+007E> API\n"), puml);
        assertTrue(puml.contains("<<removed>> <<container>> <<atomic>> [\n<U+2212> --Legacy batch--\n"), puml);
        assertTrue(
            puml.contains("rectangle shop as \"<U+00B1> Shop\\n[system]\" <<contains-changes>> <<composite>> {"),
            puml
        );
        // the links: a line style and a glyph in the label
        assertTrue(puml.contains("customer -[thickness=3,#009E73]-> shop.mobile : **+** orders on"), puml);
        assertTrue(
            puml.contains("shop.api -[dotted,thickness=2,#E69F00]-> shop.db : **<U+007E>** reads and writes"),
            puml
        );
        assertTrue(puml.contains("shop.api -[dashed,#7F7F7F]-> shop.legacy : **<U+2212>** delegates to"), puml);
        // a link that did not change is drawn as it always was
        assertTrue(puml.contains("customer --> shop.web : orders on\\n[HTTPS]"), puml);
        // a legend explains it, and the file is plain ASCII
        assertTrue(puml.contains("legend right\n**To be** compared with **As is**\n"), puml);
        assertTrue(puml.contains("| **<U+00B1>** | something inside changed: thin dashed outline | |"), puml);
        assertTrue(puml.chars().allMatch(c -> c < 128), "the glyphs are PlantUML escapes");
    }

    @Test
    void theTechnologyLayerIsDrawnWithItsChangesToo() {
        val workspace = workspace();
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is").exit);
        val puml = read("views-to-be-vs-as-is/plantuml/technology/prod-deep.puml");
        // the node changed (what it hosts), an application deployed on it is new, another one changed
        assertTrue(
            puml.contains("rectangle prod.cluster as \"<U+007E> Cluster\\n[node]\" <<changed>> <<composite>> {"),
            puml
        );
        assertTrue(
            puml.contains("rectangle cluster_shop_notifications <<new>> <<container>> <<atomic>> [\n+ Notifications\n"),
            puml
        );
        assertTrue(
            puml.contains(
                "rectangle cluster_shop_web <<changed>> <<SPA>> <<React>> <<container>> <<atomic>> [\n<U+007E> Web site\n"
            ),
            puml
        );
        assertTrue(
            puml.contains(
                "rectangle prod as \"<U+00B1> Production\\n[environment]\" <<contains-changes>> <<composite>> {"
            ),
            puml
        );
    }

    @Test
    void aPlateauThatIsTheSameAsItsBaselineHasNoDifferenceAndSaysSo() {
        val workspace = workspace();
        val added = run("-w", workspace.toString(), "plateau", "add", "same", "--from", "to-be", "--baseline", "to-be");
        assertEquals(0, added.exit, added.err);
        val result = diff(workspace, "--plateau", "same");
        assertEquals(0, result.exit, result.err);
        assertEquals(
            """
            comparing same with to-be (To be)
            elements      +0 ~0 -0
            relationships +0 ~0 -0
            wording only  0 of the 0 changed elements

            no difference
            """,
            result.out
        );
        assertTrue(diff(workspace, "--plateau", "same", "-f", "markdown").out.endsWith("No difference.\n"));
        assertTrue(diff(workspace, "--plateau", "same", "-f", "json").out.contains("\"changes\": [ ]"));
        // the views of that comparison have nothing marked, and a gap that says so
        assertEquals(0, generate(workspace, "--plateau", "same").exit);
        assertTrue(read("views-same-vs-to-be/gap.md").endsWith("No difference.\n"));
        assertFalse(read("views-same-vs-to-be/plantuml/application/shop-detailed.puml").contains("legend"));
    }

    @Test
    void aViewWithNoChangeInItIsDrawnAsItAlwaysWasAndHasNoLegend() {
        val workspace = workspace();
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is").exit);
        // nothing of the auditor changed, and nothing around it
        val puml = read("views-to-be-vs-as-is/plantuml/application/auditor-overview.puml");
        assertFalse(puml.contains("legend"), puml);
        assertFalse(puml.contains("<<new>>"), puml);
        assertFalse(puml.contains(".new {"), puml);
        assertFalse(puml.contains(".changed {"), puml);
        assertFalse(puml.contains("<U+"), puml);
        // the same bytes as the view of the plateau alone: a comparison that says nothing changes nothing
        assertEquals(read("views-to-be/plantuml/application/auditor-overview.puml"), puml);
    }

    @Test
    void theDefaultStylesAreWrittenForTheStatesAViewUsesAndTheAuthorsStyleWinsPropertyByProperty() {
        val workspace = workspace();
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is").exit);
        val puml = read("views-to-be-vs-as-is/plantuml/application/shop-detailed.puml");
        // new: a thick solid outline
        assertTrue(
            puml.contains(".new {\nrectangle {\nLineColor: #009E73\nLineStyle: 0\nLineThickness: 3\n}\n}"),
            puml
        );
        // changed: dotted
        assertTrue(
            puml.contains(".changed {\nrectangle {\nLineColor: #E69F00\nLineStyle: 2\nLineThickness: 2\n}\n}"),
            puml
        );
        // the container of changes: thin and dashed
        assertTrue(
            puml.contains(".contains-changes {\nrectangle {\nLineColor: #5B7C99\nLineStyle: 4\nLineThickness: 1\n}\n}"),
            puml
        );
        // removed: the author wrote `line-color: red` for it; every other property is the default's
        assertTrue(
            puml.contains(
                ".removed {\nrectangle {\nBackgroundColor: #EEEEEE\nLineColor: red\nLineStyle: 7\nLineThickness: 2\nFontColor: #7F7F7F\n}\n}"
            ),
            puml
        );
        // the default of a state a view does not use is not written (the author's own style of `removed` always is)
        val web = read("views-to-be-vs-as-is/plantuml/application/shop_web-deep.puml");
        assertTrue(web.contains(".changed {"), web);
        assertFalse(web.contains(".new {"), web);
    }

    // ---- facets

    @Test
    void aFacetCanReadWhatChangedAndAnOrdinaryFacetKeepsWorking() {
        val workspace = workspace();
        assertEquals(0, generate(workspace, "--plateau", "to-be", "--baseline", "as-is").exit);

        // `without-removed` selects on `change`: what only the baseline had, and what points at it, is gone
        val without = files("views-to-be-vs-as-is-without-removed");
        assertFalse(without.contains("plantuml/application/shop_legacy-overview.puml"), without.toString());
        assertTrue(without.contains("plantuml/application/shop_mobile-overview.puml"), without.toString());
        val kept = read("views-to-be-vs-as-is-without-removed/plantuml/application/shop-detailed.puml");
        assertFalse(kept.contains("legacy"), kept);
        assertFalse(kept.contains("<<removed>>"), kept);
        // what is left of the comparison is still drawn as one
        assertTrue(kept.contains("<<new>> <<container>> <<atomic>> [\n+ Mobile app"), kept);
        assertTrue(kept.contains("shop.api -[dotted,thickness=2,#E69F00]-> shop.db"), kept);
        // the same facet on the plateau alone selects nothing: there is no `change` there
        assertEquals(files("views-to-be"), files("views-to-be-without-removed"));

        // `no-orders` knows nothing of the comparison and removes a label: the comparison still shows the rest
        val orders = read("views-to-be-vs-as-is-no-orders/plantuml/application/shop-detailed.puml");
        assertFalse(orders.contains("orders on"), orders);
        assertTrue(orders.contains("shop.api -[dashed,#7F7F7F]-> shop.legacy"), orders);
        assertTrue(orders.contains("<<removed>>"), orders);
        // each folder has what its facet leaves, in the template of the facets
        assertTrue(files("views-to-be-vs-as-is-no-orders").contains("plantuml/application/shop_legacy-overview.puml"));
    }
}

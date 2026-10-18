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
    private static final Path REPLACES = FIXTURE.resolve("replaces");
    private static final Path EXAMPLE = Path.of("src/doc/examples/domain_plateaus");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private Path workspace() {
        return copy(FIXTURE, dir);
    }

    /** The invented warehouse of {@code replaces}: a workspace of its own, apart from the bookshop. */
    private Path replacesWorkspace() {
        val workspace = dir.resolve("replaces").resolve("workspace.yaml");
        return Files.exists(workspace) ? workspace : copy(REPLACES, dir.resolve("replaces"));
    }

    @SneakyThrows
    private Path copy(Path fixture, Path into) {
        try (val files = Files.walk(fixture)) {
            for (val source : files.toList()) {
                if (
                    source.getFileName().toString().equals("expected-counts.json") ||
                    (source.startsWith(REPLACES) && fixture == FIXTURE)
                ) {
                    continue; // the contract the editor's tests read too, not a file of the workspace; and a workspace of its own
                }
                val target = into.resolve(fixture.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        return into.resolve("workspace.yaml");
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
            errorOutput.install(commandLine);
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

    // ---- replaces: an element that says what it replaces is moved, split or merged, never removed and new

    private static final String REPLACES_WARNING =
        "warning: replaces of shop.report-b (application layer): shop.nowhere is not an element of the base plateau, ignored";

    private static final String REPLACES_AFTER_BEFORE = """
    comparing after with before
    elements      +1 ~0 -2
    replacing     1 moved, 2 split, 1 merged
    relationships +0 ~0 -0
    wording only  0 of the 0 changed elements

    CHANGE   THING    LAYER        REFERENCE          NATURES  DETAILS
    removed  element  application  shop.mailer        -        name: "Mailer"
    new      element  application  shop.postman       -        name: "Postman"
    split    element  application  shop.report-a      -        from shop.report; name: "Sales report"; split with shop.report-b
    split    element  application  shop.report-b      -        from shop.report; name: "Stock report"; split with shop.report-a
    removed  element  application  shop.report.chart  -        name: "Chart"
    merged   element  application  stock.place        -        from stock.bin, stock.shelf; name: "Place"
    moved    element  application  stock.till         name     from shop.till; name: "Till" -> "Cash desk"

    candidates, not applied (each pair looks like one thing said twice; to accept one, write `replaces: [FROM]` on the element TO)
    LAYER        FROM         TO            REASONS
    application  shop.mailer  shop.postman  description, parent
    """;

    @Test
    void diffTellsWhatMovedWasSplitAndMergedAndWhereItCameFromInASortedTable() {
        val result = diff(replacesWorkspace(), "--plateau", "after");
        assertEquals(0, result.exit, result.err);
        assertEquals(REPLACES_AFTER_BEFORE, result.out);
        // the replaced elements are not removed: no row, no count
        for (val replaced : List.of("shop.till ", "shop.report ", "stock.bin", "stock.shelf")) {
            assertFalse(
                result.out.lines().anyMatch(line -> line.startsWith("removed") && line.contains(replaced)),
                replaced + "\n" + result.out
            );
        }
        // the rows are sorted by the reference of the element itself, and the same bytes come again
        assertEquals(REPLACES_AFTER_BEFORE, diff(replacesWorkspace(), "--plateau", "after").out);
    }

    @Test
    @SneakyThrows
    void theManualShowsWhatTheCommandPrintsOnTheWarehouse() {
        val manual = Files.readString(Path.of("src/doc/README.adoc"));
        assertTrue(
            manual.contains(REPLACES_WARNING + "\n" + REPLACES_AFTER_BEFORE),
            "the sample of `diff` in the manual"
        );
    }

    @Test
    void markdownTellsTheIdentityAndListsTheCandidatesApartAndNotApplied() {
        val result = diff(replacesWorkspace(), "--plateau", "after", "--format", "markdown");
        assertEquals(0, result.exit, result.err);
        val lines = result.out.lines().toList();
        assertTrue(lines.contains("| elements | 1 | 0 | 2 |"), result.out);
        assertTrue(lines.contains("Replacing elements: 1 moved, 2 split, 1 merged."), result.out);
        assertTrue(
            lines.contains(
                "| moved | element | application | stock.till | name | from shop.till; name: \"Till\" -> \"Cash desk\" |"
            ),
            result.out
        );
        assertTrue(
            lines.contains(
                "| merged | element | application | stock.place | - | from stock.bin, stock.shelf; name: \"Place\" |"
            ),
            result.out
        );
        assertTrue(
            lines.contains(
                "| split | element | application | shop.report-a | - | from shop.report; name: \"Sales report\"; split with shop.report-b |"
            ),
            result.out
        );
        val heading = lines.indexOf("## Candidates, not applied");
        assertTrue(heading > lines.indexOf("| Change | Thing | Layer | Reference | Natures | Details |"), result.out);
        assertTrue(lines.contains("| application | shop.mailer | shop.postman | description, parent |"), result.out);
        assertTrue(
            lines.contains(
                "Each pair looks like one thing said twice. To accept one, write `replaces: [FROM]` on the element TO."
            ),
            result.out
        );
        // the candidate is not applied: the mailer is still removed and the postman still new
        assertTrue(lines.contains("| removed | element | application | shop.mailer | - | name: \"Mailer\" |"));
        assertTrue(lines.contains("| new | element | application | shop.postman | - | name: \"Postman\" |"));
    }

    @Test
    @SneakyThrows
    void jsonHasTheIdentityOfEachRowAndTheCandidatesMarkedNotApplied() {
        val result = diff(replacesWorkspace(), "--plateau", "after", "--format", "json");
        assertEquals(0, result.exit, result.err);
        val json = new ObjectMapper().readTree(result.out);
        assertEquals(1, json.at("/counts/elements/moved").asInt());
        assertEquals(2, json.at("/counts/elements/split").asInt());
        assertEquals(1, json.at("/counts/elements/merged").asInt());
        assertEquals(1, json.at("/counts/elements/new").asInt());
        assertEquals(2, json.at("/counts/elements/removed").asInt());
        assertEquals(7, json.get("changes").size());
        val till = rowOf(json, "stock.till");
        assertEquals("moved", till.get("change").asText());
        assertEquals(List.of("shop.till"), strings(till.get("replaces")));
        assertEquals("Till", till.at("/before/name").asText());
        assertEquals("Cash desk", till.at("/after/name").asText());
        val place = rowOf(json, "stock.place");
        assertEquals("merged", place.get("change").asText());
        assertEquals(List.of("stock.bin", "stock.shelf"), strings(place.get("replaces")));
        assertEquals(List.of("shop.report"), strings(rowOf(json, "shop.report-a").get("replaces")));
        assertEquals(List.of("shop.report"), strings(rowOf(json, "shop.report-b").get("replaces")));
        assertFalse(rowOf(json, "shop.mailer").has("replaces"));
        assertEquals(1, json.get("candidates").size());
        val candidate = json.at("/candidates/0");
        assertEquals("application", candidate.get("layer").asText());
        assertEquals("shop.mailer", candidate.get("from").asText());
        assertEquals("shop.postman", candidate.get("to").asText());
        assertEquals(List.of("description", "parent"), strings(candidate.get("reasons")));
        assertFalse(candidate.get("applied").asBoolean(), "a candidate is never applied");
    }

    private static List<String> strings(JsonNode list) {
        val out = new java.util.ArrayList<String>();
        list.forEach(item -> out.add(item.asText()));
        return out;
    }

    @Test
    void noWordingLeavesTheIdentityAndTheCandidatesAlone() {
        val workspace = replacesWorkspace();
        val all = diff(workspace, "--plateau", "after");
        val quiet = diff(workspace, "--plateau", "after", "--no-wording");
        assertEquals(0, quiet.exit, quiet.err);
        // nothing here is wording only: the same table, and the line that says how many are hidden
        assertEquals(
            all.out.replace(
                "wording only  0 of the 0 changed elements\n",
                "wording only  0 of the 0 changed elements\n0 wording-only changes hidden (--no-wording)\n"
            ),
            quiet.out
        );
        assertTrue(quiet.out.contains("replacing     1 moved, 2 split, 1 merged\n"), quiet.out);
        assertTrue(quiet.out.contains("application  shop.mailer  shop.postman"), quiet.out);
    }

    @Test
    @SneakyThrows
    void aPlateauThatDoesNotUseReplacesIsToldAsItAlwaysWasEvenWhenTheKernelFindsACandidate() {
        // the example of the manual with every `replaces` taken out of it: the reviews and the ratings still look like one thing
        // said twice (the kernel finds it), but the plateau says nothing of `replaces`, so the table does not list a candidate
        val workspace = copy(EXAMPLE, dir.resolve("example"));
        try (val files = Files.walk(dir.resolve("example").resolve("plateaus"))) {
            for (val file : files.filter(f -> f.toString().endsWith(".yaml")).toList()) {
                Files.writeString(file, Files.readString(file).replaceAll("(?m)^ *replaces:\\n( +- [^\\n]*\\n)+", ""));
            }
        }
        for (val format : List.of("text", "markdown", "json")) {
            val result = diff(workspace, "--plateau", "to-be", "--format", format);
            assertEquals(0, result.exit, result.err);
            assertFalse(result.out.contains("andidate"), format + "\n" + result.out);
            assertFalse(result.out.contains("replacing") || result.out.contains("Replacing"), format);
            assertEquals("", result.err, format);
        }
        // and the same example with its `replaces` lists the candidate, so the difference above is the plateau's
        assertTrue(
            diff(copy(EXAMPLE, dir.resolve("with")), "--plateau", "to-be").out.contains("candidates, not applied")
        );
    }

    @Test
    void diffTellsMovedSplitAndMergedOnTheExampleOfTheManualWithOneCandidateNotApplied() {
        val result = diff(copy(EXAMPLE, dir.resolve("example")), "--plateau", "to-be");
        assertEquals(0, result.exit, result.err);
        assertEquals("", result.err, "the hand-written `new` of the example agrees with the comparison");
        assertTrue(
            result.out.contains("elements      +2 ~2 -2\nreplacing     2 moved, 2 split, 1 merged\n"),
            result.out
        );
        assertTrue(result.out.contains("application  shop.reviews  shop.ratings  description"), result.out);
        // the replaced elements are not removed: the inventory and its child moved, the orders were split, the invoices merged
        for (val replaced : List.of("shop.inventory", "shop.orders", "shop.invoices", "shop.receipts")) {
            assertFalse(
                result.out.lines().anyMatch(line -> line.startsWith("removed") && line.contains(replaced)),
                replaced + "\n" + result.out
            );
        }
    }

    @Test
    @SneakyThrows
    void theManualShowsWhatTheCommandPrintsOnTheExampleOfTheManual() {
        val manual = Files.readString(Path.of("src/doc/README.adoc"));
        val result = diff(copy(EXAMPLE, dir.resolve("example")), "--plateau", "to-be");
        assertEquals(0, result.exit, result.err);
        // quoted twice: in the tutorial (step 5) and under `diff`
        val quotes = manual.split(
            java.util.regex.Pattern.quote("----\n" + result.out.stripTrailing() + "\n----\n"),
            -1
        );
        assertEquals(
            3,
            quotes.length,
            "the sample of `diff` on the example is in the manual twice, as the command prints it"
        );
    }

    @Test
    void theWarningsOfTheComparisonAreOnTheErrorOutputOfDiffAndTheTableIsStillAlone() {
        val result = diff(replacesWorkspace(), "--plateau", "after");
        assertEquals(0, result.exit, result.err);
        // seen by the user: the error output of the real command line, not the log (which the level of the application hides)
        assertEquals(REPLACES_WARNING + "\n", result.err);
        assertFalse(result.out.contains("warning"), result.out);
        for (val format : List.of("markdown", "json")) {
            val other = diff(replacesWorkspace(), "--plateau", "after", "--format", format);
            assertEquals(REPLACES_WARNING + "\n", other.err, format);
            assertFalse(other.out.contains("shop.nowhere"), format);
        }
    }

    @Test
    void theWarningsOfTheComparisonAreOnTheErrorOutputOfViewsGenerateWithABaselineAndOnlyThere() {
        val workspace = replacesWorkspace();
        val result = generate(workspace, "--plateau", "after", "--baseline", "before");
        assertEquals(0, result.exit, result.err);
        assertEquals(REPLACES_WARNING + "\n", result.err);
        assertEquals("", result.out);
        // without a comparison nothing is compared, so there is nothing to say about what a plateau replaces
        val plain = generate(replacesWorkspace(), "--plateau", "after");
        assertEquals(0, plain.exit, plain.err);
        assertEquals("", plain.err);
    }

    @Test
    @SneakyThrows
    void everyReplacesTheComparisonIgnoresIsToldWithTheElementThatSaidIt() {
        val workspace = replacesWorkspace();
        val shop = workspace.getParent().resolve("plateaus/20_after/shop.yaml");
        // the web site is still in the plateau, and the mailer is listed twice (the kernel is given the list as written)
        Files.writeString(
            shop,
            Files.readString(shop).replace(
                "      name: \"Postman\"\n",
                "      name: \"Postman\"\n      replaces:\n        - \"shop.web\"\n        - \"shop.mailer\"\n        - \"shop.mailer\"\n"
            )
        );
        val result = diff(workspace, "--plateau", "after");
        assertEquals(0, result.exit, result.err);
        assertEquals(
            List.of(
                "warning: replaces of shop.postman (application layer): shop.web is still an element of the target plateau, ignored",
                "warning: replaces of shop.postman (application layer) lists shop.mailer twice, counted once",
                REPLACES_WARNING
            ),
            result.err.lines().toList()
        );
        // the postman replaces the mailer now: the mailer is no longer removed, and there is no candidate left
        assertTrue(result.out.contains("moved    element  application  shop.postman"), result.out);
        assertTrue(result.out.contains("from shop.mailer"), result.out);
        assertFalse(result.out.contains("candidates"), result.out);
    }

    @Test
    void theViewsOfTheComparisonDrawTheThreeStatesWithAGlyphAndTheirOwnLine() {
        val workspace = replacesWorkspace();
        val result = generate(workspace, "--plateau", "after", "--baseline", "before");
        assertEquals(0, result.exit, result.err);
        val stock = read("replaces/views-after-vs-before/plantuml/application/stock-detailed.puml");
        assertTrue(
            stock.contains("<<moved>> <<container>> <<atomic>> [\n<U+2192> Cash desk (from shop.till)\n"),
            stock
        );
        assertTrue(
            stock.contains("<<merged>> <<container>> <<atomic>> [\n<U+2295> Place (from stock.bin, stock.shelf)\n"),
            stock
        );
        assertTrue(
            stock.contains(".moved {\nrectangle {\nLineColor: #0072B2\nLineStyle: 12\nLineThickness: 2\n}\n}\n"),
            stock
        );
        assertTrue(
            stock.contains(".merged {\nrectangle {\nLineColor: #56B4E9\nLineStyle: 3-9\nLineThickness: 2\n}\n}\n"),
            stock
        );
        // the legend explains the two the view uses
        assertTrue(
            stock.contains("| **<U+2192>** | moved or renamed, replaces one element: long dashes, wide gaps | |"),
            stock
        );
        assertTrue(
            stock.contains("| **<U+2295>** | merged, replaces several elements: short dashes, far apart | |"),
            stock
        );
        assertFalse(stock.contains("split"), stock);
        val shop = read("replaces/views-after-vs-before/plantuml/application/shop-detailed.puml");
        assertTrue(
            shop.contains("<<split>> <<container>> <<atomic>> [\n<U+22D4> Sales report (from shop.report)\n"),
            shop
        );
        assertTrue(
            shop.contains("<<split>> <<container>> <<atomic>> [\n<U+22D4> Stock report (from shop.report)\n"),
            shop
        );
        // the replaced element that only holds what was removed from it says what replaces it, and is not drawn as a plain removed box
        assertTrue(shop.contains("<U+2212> --Report-- (replaced by shop.report-a, shop.report-b)\n"), shop);
        // the moved till is not drawn as removed, nor is the bin
        assertFalse(shop.contains("--Till--"), shop);
        assertFalse(stock.contains("--Bin--"), stock);
        // an element that replaces nothing is what it was: the unrelated mailer is removed, the postman new
        assertTrue(shop.contains("<<removed>> <<container>> <<atomic>> [\n<U+2212> --Mailer--\n"), shop);
        assertTrue(shop.contains("<<new>> <<container>> <<atomic>> [\n+ Postman\n"), shop);
    }

    @Test
    @SneakyThrows
    void theGapFilesNextToTheViewsTellTheSameAsTheTableAndTheCandidates() {
        val workspace = replacesWorkspace();
        assertEquals(0, generate(workspace, "--plateau", "after", "--baseline", "before").exit);
        val markdown = read("replaces/views-after-vs-before/gap.md");
        assertEquals(diff(workspace, "--plateau", "after", "--format", "markdown").out, markdown);
        val json = read("replaces/views-after-vs-before/gap.json");
        assertEquals(diff(workspace, "--plateau", "after", "--format", "json").out, json);
        assertTrue(markdown.contains("## Candidates, not applied"), markdown);
        assertTrue(json.contains("\"applied\": false"), json);
        assertTrue(json.contains("\"replaces\": ["), json);
    }

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
                ".removed {\nrectangle {\nBackgroundColor: #EEEEEE\nLineColor: red\nLineStyle: 16-3\nLineThickness: 2\nFontColor: #7F7F7F\n}\n}"
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

    // ---- a label that is written with spaces around it, or left empty, is the same label for the kernel

    @SneakyThrows
    private void replaceIn(String file, String from, String to) {
        val path = dir.resolve(file);
        val text = Files.readString(path);
        assertTrue(text.contains(from), file + " has no " + from);
        Files.writeString(path, text.replace(from, to));
    }

    @Test
    @SneakyThrows
    void aLabelWithSpacesAroundItOrLeftEmptyIsTheLabelTheKernelCompares() {
        val workspace = workspace();
        // the target says "calls " where the baseline says "calls" (nothing changed), says "orders on " for a new link, and
        // leaves the label of another new link empty (a label that is empty is no label); the baseline says "delegates to " for a link the target removed
        replaceIn(
            "plateaus/20_to-be/shop.yaml",
            "id: \"web\"\n      name: \"Web site\"\n      qualifiers:\n        - \"React\"\n        - \"SPA\"\n      relationships:\n        - destination: \"shop.api\"\n          label: \"calls\"",
            "id: \"web\"\n      name: \"Web site\"\n      qualifiers:\n        - \"React\"\n        - \"SPA\"\n      relationships:\n        - destination: \"shop.api\"\n          label: \"calls \""
        );
        replaceIn(
            "plateaus/20_to-be/shop.yaml",
            "id: \"mobile\"\n      name: \"Mobile app\"\n      relationships:\n        - destination: \"shop.api\"\n          label: \"calls\"",
            "id: \"mobile\"\n      name: \"Mobile app\"\n      relationships:\n        - destination: \"shop.api\"\n          label: \"\""
        );
        replaceIn(
            "plateaus/20_to-be/customer.yaml",
            "- destination: \"shop.mobile\"\n      label: \"orders on\"",
            "- destination: \"shop.mobile\"\n      label: \"orders on \""
        );
        replaceIn("plateaus/10_as-is/shop.yaml", "label: \"delegates to\"", "label: \"delegates to \"");
        replaceIn(
            "workspace.yaml",
            "    customs:\n",
            "    customs:\n      - name: \"without-new\"\n        actions:\n          - operator: \"REMOVE\"\n            json-path: \"$..relationships[?(@.change == 'new')]\"\n"
        );
        val result = generate(workspace, "--plateau", "to-be", "--baseline", "as-is");
        assertEquals(0, result.exit, result.err);
        // the same comparison as without the spaces
        val diff = diff(workspace, "--plateau", "to-be", "--baseline", "as-is", "-f", "json");
        assertEquals(0, diff.exit, diff.err);
        assertEquals(diff.out, read("views-to-be-vs-as-is/gap.json"));
        val counts = new ObjectMapper().readTree(diff.out).at("/counts/relationships");
        assertEquals(2, counts.get("new").asInt());
        assertEquals(1, counts.get("changed").asInt());
        assertEquals(2, counts.get("removed").asInt());
        val puml = read("views-to-be-vs-as-is/plantuml/application/shop-detailed.puml");
        assertTrue(puml.contains("customer -[thickness=3,#009E73]-> shop.mobile : **+** orders on"), puml);
        assertTrue(puml.contains("shop.api -[dashed,#7F7F7F]-> shop.legacy : **<U+2212>** delegates to"), puml);
        assertFalse(puml.contains("shop.web -[thickness=3"), "the label with spaces is not a new link: " + puml);
        assertTrue(puml.contains("shop.mobile -[thickness=3,#009E73]-> shop.api : **+**"), puml);
        // a facet that selects on `change` sees the new link whose label has a space, and the removed one is there once
        val without = read("views-to-be-vs-as-is-without-new/plantuml/application/shop-detailed.puml");
        assertFalse(without.contains("shop.mobile : "), without);
        assertFalse(without.contains("> shop.mobile"), without);
        assertTrue(without.contains("customer --> shop.web : orders on"), without);
        assertEquals(1, without.split("-> shop.legacy", -1).length - 1, without);
    }

    // ---- the relationships of a split element (issue #61, wave 013, run 0069)

    private static final Path SPLIT = Path.of("src/test/resources/split-relationships");

    private static final String SPLIT_SHOP = """
    comparing after with before
    elements      +0 ~1 -0
    replacing     0 moved, 2 split, 0 merged
    relationships +5 ~0 -0
    of a split    4 of the 5 new relationships belong to split elements (not compared with the baseline)
    wording only  0 of the 1 changed elements

    CHANGE   THING         LAYER        REFERENCE                                            NATURES              DETAILS
    split    element       application  shop.orders-billing                                  relationships-added  from shop.orders; name: "Order billing"; split with shop.orders-intake
    split    element       application  shop.orders-intake                                   relationships-added  from shop.orders; name: "Order intake"; split with shop.orders-billing
    changed  element       application  shop.web                                             relationships-added
    new      relationship  application  shop.orders-billing -> shop.mail (asks)              -                    of the split shop.orders-billing
    new      relationship  application  shop.orders-billing -> shop.orders-intake (follows)  -                    of the split shop.orders-billing, shop.orders-intake
    new      relationship  application  shop.orders-intake -> shop.db (stores in)            -                    of the split shop.orders-intake
    new      relationship  application  shop.web -> shop.db (reads)                          -
    new      relationship  application  shop.web -> shop.orders-intake (places orders with)  -                    of the split shop.orders-intake
    """;

    @Test
    void aNewRelationshipOfASplitElementSaysSoInTheTextAndTheHeaderCountsThem() {
        val result = diff(copy(SPLIT, dir.resolve("split")), "--plateau", "after");
        assertEquals(0, result.exit, result.err);
        assertEquals("", result.err);
        assertEquals(SPLIT_SHOP, result.out);
    }

    @Test
    @SneakyThrows
    void theMarkdownAndTheJsonSayItToo() {
        val workspace = copy(SPLIT, dir.resolve("split"));
        val markdown = diff(workspace, "--plateau", "after", "--format", "markdown").out;
        assertTrue(
            markdown.contains(
                "Of the 5 new relationships, 4 belong to split elements: the comparison does not compare the relationships of a split element with the baseline.\n\n"
            ),
            markdown
        );
        assertTrue(
            markdown.contains(
                "| new | relationship | application | shop.orders-billing -> shop.orders-intake (follows) | - | of the split shop.orders-billing, shop.orders-intake |\n"
            ),
            markdown
        );
        assertTrue(
            markdown.contains("| new | relationship | application | shop.web -> shop.db (reads) | - |  |\n"),
            "a really new relationship has no note\n" + markdown
        );
        val json = new ObjectMapper().readTree(diff(workspace, "--plateau", "after", "--format", "json").out);
        assertEquals(4, json.at("/counts/relationships/of_split").asInt());
        assertEquals(5, json.at("/counts/relationships/new").asInt());
        val owners = new java.util.TreeMap<String, String>();
        for (val row : json.get("changes")) {
            if (row.get("thing").asText().equals("relationship")) {
                owners.put(
                    row.get("reference").asText() + " -> " + row.get("destination").asText(),
                    row.has("of_split") ? row.get("of_split").toString() : "-"
                );
            }
        }
        assertEquals("-", owners.get("shop.web -> shop.db"));
        assertEquals("[\"shop.orders-intake\"]", owners.get("shop.web -> shop.orders-intake"));
        assertEquals(
            "[\"shop.orders-billing\",\"shop.orders-intake\"]",
            owners.get("shop.orders-billing -> shop.orders-intake")
        );
        assertFalse(
            json.at("/changes").toString().contains("\"of_split\":[]"),
            "the key exists only when there is something to say"
        );
    }

    @Test
    @SneakyThrows
    void theGapFilesOfViewsGenerateSayItAndAComparisonWithoutASplitIsWrittenAsItAlwaysWas() {
        val workspace = copy(SPLIT, dir.resolve("split"));
        val generated = generate(workspace, "--plateau", "after", "--baseline", "before");
        assertEquals(0, generated.exit, generated.err);
        val gap = Files.readString(dir.resolve("split").resolve("views-after-vs-before/gap.md"));
        assertTrue(gap.contains("belong to split elements"), gap);
        assertEquals(
            diff(workspace, "--plateau", "after", "--format", "json").out,
            Files.readString(dir.resolve("split").resolve("views-after-vs-before/gap.json"))
        );
        // the same pair where nothing is split: no line, no key
        val bookshop = workspace();
        for (val format : List.of("text", "markdown", "json")) {
            val result = diff(bookshop, "--plateau", "to-be", "--format", format);
            assertFalse(result.out.contains("split"), format + "\n" + result.out);
            assertFalse(result.out.contains("of_split"), format);
        }
    }
}

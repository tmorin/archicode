package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A state written by hand ({@code rendering-stereotypes: "new"}) on an element that does not have it looks the same in
 * the command line and in the editor (issue 28, decision D-5 of wave 009): the default look of a state is for the box that
 * has the state computed, and the author is told, on the error output, where a word and the comparison disagree.
 *
 * <p>The case is the invented ticket office of {@code src/test/resources/plateau-state-tags}, which
 * {@code state-tags.test.js} draws in the editor: the counter did not change and carries {@code new}, the queue did not
 * change and carries {@code changed}, the printer changed and carries {@code new}, the window is new and carries
 * {@code new}, the kiosk is new.
 */
@QuarkusTest
class StateTagRuleTest {

    private static final Path FIXTURE = Path.of("src/test/resources/plateau-state-tags");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

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

    private Path office(Path into) {
        return copy(FIXTURE, into);
    }

    @SneakyThrows
    private Path copy(Path fixture, Path into) {
        try (val files = Files.walk(fixture)) {
            for (val source : files.toList()) {
                val target = into.resolve(fixture.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        return into.resolve(".archicode.yaml");
    }

    /** The file of a view of the comparison, as the command line wrote it. */
    @SneakyThrows
    private String view(String folder, String file) {
        return Files.readString(dir.resolve(folder).resolve("plantuml/application").resolve(file));
    }

    /** The lines of a style block: {@code .name { ... }} up to the closing line, for the first shape of the file. */
    private List<String> block(String puml, String stereotype) {
        val lines = puml.lines().toList();
        val start = lines.indexOf("." + stereotype + " {");
        assertTrue(start >= 0, "a style for " + stereotype + " in " + puml);
        var end = start + 1;
        while (!("}".equals(lines.get(end)) && "}".equals(lines.get(end + 1)))) {
            end++;
        }
        return lines.subList(start, end + 2);
    }

    private String boxOf(String puml, String id) {
        return puml
            .lines()
            .filter(l -> l.startsWith("rectangle " + id + " "))
            .findFirst()
            .orElseThrow();
    }

    @Test
    void aWordWrittenByHandOnABoxWithoutTheStateDoesNotGetTheDefaultLookOfTheState() {
        val workspace = office(dir);
        val result = run("-w", workspace.toString(), "views", "generate", "--against", "before");
        assertEquals(0, result.exit, result.err);
        val puml = view("views-after-vs-before", "office-detailed.puml");

        // the box that has the state keeps the stereotype of the state, which carries the default look
        assertTrue(boxOf(puml, "office.kiosk").contains("<<new>>"), boxOf(puml, "office.kiosk"));
        assertTrue(boxOf(puml, "office.window").contains("<<new>>"), "the tag agrees with the comparison");
        assertFalse(boxOf(puml, "office.window").contains("written-"), boxOf(puml, "office.window"));
        // the box that carries the word without the state has another stereotype for it, the author's own
        assertTrue(boxOf(puml, "office.counter").contains("<<written-new>>"), boxOf(puml, "office.counter"));
        assertFalse(boxOf(puml, "office.counter").contains("<<new>>"), boxOf(puml, "office.counter"));
        assertTrue(boxOf(puml, "office.queue").contains("<<written-changed>>"), boxOf(puml, "office.queue"));
        // on an element that changed, the computed state is first (it wins in PlantUML), the word follows it
        assertTrue(
            boxOf(puml, "office.printer").contains("<<changed>> <<written-new>>"),
            boxOf(puml, "office.printer")
        );

        // the default look of `new` (the thick line) is the style of `new` only, with the colour of the author over it...
        val stateOfNew = block(puml, "new");
        assertTrue(stateOfNew.contains("LineThickness: 3"), stateOfNew.toString());
        assertTrue(stateOfNew.contains("LineColor: #7B3FA0"), stateOfNew.toString());
        // ...and the author's own style of `new` is all that the written word gets
        val writtenNew = block(puml, "written-new");
        assertTrue(writtenNew.contains("LineColor: #7B3FA0"), writtenNew.toString());
        assertFalse(writtenNew.stream().anyMatch(l -> l.startsWith("LineThickness")), writtenNew.toString());
        assertFalse(writtenNew.stream().anyMatch(l -> l.startsWith("LineStyle")), writtenNew.toString());
        // the author has no style for `changed`: a written one has no style
        assertFalse(puml.contains(".written-changed {"), puml);

        // the glyph and the struck title are for the state: the counter is drawn as it is
        assertTrue(puml.contains("\n+ Kiosk\n"), puml);
        assertFalse(puml.contains("+ Counter"), puml);
    }

    @Test
    void theAuthorIsToldOnTheErrorOutputWhereAWordAndTheComparisonDisagree() {
        val workspace = office(dir);
        val result = run("-w", workspace.toString(), "views", "generate", "--against", "before");
        assertEquals(0, result.exit, result.err);
        // on the error output, not in the log (the log level is ERROR and hides log.warn), and not on the standard output
        val warnings = result.err.lines().toList();
        assertEquals(3, warnings.size(), result.err);
        assertTrue(
            warnings
                .get(0)
                .startsWith("warning: the element `office.counter` carries `new` (`rendering-stereotypes` tag)"),
            warnings.get(0)
        );
        assertTrue(
            warnings.get(0).contains("the comparison of `after` with `before` finds that it did not change"),
            warnings.get(0)
        );
        assertTrue(warnings.get(1).startsWith("warning: the element `office.printer` carries `new`"), warnings.get(1));
        assertTrue(warnings.get(1).contains("finds that it is changed"), warnings.get(1));
        assertTrue(
            warnings.get(2).startsWith("warning: the element `office.queue` carries `changed`"),
            warnings.get(2)
        );
        assertTrue(warnings.get(2).contains("not with the default look of the state"), warnings.get(2));
        // the kiosk is new without a word, the window carries `new` and is new: nothing to say
        assertFalse(result.err.contains("office.kiosk") || result.err.contains("office.window"), result.err);
        assertEquals("", result.out, "the standard output is for what the command prints, and it prints nothing");
    }

    @Test
    void diffSaysItOnTheErrorOutputAndKeepsItsTableOnTheStandardOutput() {
        val workspace = office(dir);
        val result = run("-w", workspace.toString(), "diff", "--plateau", "after");
        assertEquals(0, result.exit, result.err);
        assertEquals(3, result.err.lines().count(), result.err);
        assertTrue(result.err.contains("`office.counter` carries `new`"), result.err);
        assertFalse(result.out.contains("warning"), result.out);
        assertTrue(result.out.contains("new      element  application  office.kiosk"), result.out);
        // the table is the same whether or not the author is told: a second run says the same
        val again = run("-w", workspace.toString(), "diff", "--plateau", "after");
        assertEquals(result.out, again.out);
        assertEquals(result.err, again.err);
    }

    @Test
    void withoutAComparisonTheWordIsTheAuthorsOwnAndTheViewsAreWhatTheyWere() {
        val workspace = office(dir);
        val result = run("-w", workspace.toString(), "views", "generate", "--plateau", "baseline");
        assertEquals(0, result.exit, result.err);
        // the root is drawn alone and nothing is compared: every word is a state nobody computed
        val warnings = result.err.lines().toList();
        assertEquals(3, warnings.size(), result.err);
        assertTrue(warnings.get(0).startsWith("warning: the element `office.counter` carries `new`"), warnings.get(0));
        assertTrue(warnings.get(0).contains("nothing is compared here"), warnings.get(0));
        assertTrue(warnings.stream().anyMatch(l -> l.contains("`office.queue` carries `changed`")), result.err);
        // and the stereotype is the word itself, with the style the author gave it, as before
        val puml = view("views-baseline", "office-detailed.puml");
        assertTrue(boxOf(puml, "office.counter").contains("<<new>>"), boxOf(puml, "office.counter"));
        assertFalse(puml.contains("written-"), puml);
    }

    /**
     * The sentences are the ones the editor tells (issue 36): {@code state-hints.test.js} reads the same file, the same fixture, and
     * fails if the editor's sentences are not these ones, word for word. One sentence per line, without {@code warning: }.
     */
    @Test
    @SneakyThrows
    void theSentencesAreTheOnesTheEditorTellsForTheSameFiles() {
        val workspace = copy(Path.of("src/test/resources/plateau-state-hints"), dir);
        val result = run("-w", workspace.toString(), "diff", "--plateau", "after");
        assertEquals(0, result.exit, result.err);
        val expected = Files.readAllLines(Path.of("src/test/resources/state-hints/expected-sentences.txt"));
        assertEquals(
            expected,
            result.err
                .lines()
                .map(l -> l.replaceFirst("^warning: ", ""))
                .toList(),
            result.err
        );
    }

    @Test
    @SneakyThrows
    void aWorkspaceWithoutPlateausHasNothingToDisagreeWithAndSaysNothing() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.copy(FIXTURE.resolve("plateaus/10_before/office.yaml"), dir.resolve("manifests/office.yaml"));
        Files.writeString(
            dir.resolve(".archicode.yaml"),
            "styles:\n  by-tags:\n    new:\n      line-color: \"#7B3FA0\"\nsettings:\n  name: \"Ticket office\"\n"
        );
        val result = run("-w", dir.resolve(".archicode.yaml").toString(), "views", "generate");
        assertEquals(0, result.exit, result.err);
        assertEquals("", result.err);
        assertTrue(
            Files.readString(dir.resolve("views/plantuml/application/office-detailed.puml")).contains("<<new>>")
        );
    }
}

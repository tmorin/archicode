package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The comparison of two plateaus reads the {@code replaces} of a manifest as it was written (wave 010, D-3, issue #40):
 * the kernel says a reference is listed twice, that an entry is not a reference, that the value is not a list, and the
 * command line prints it on its error output. The model keeps the references as a set; what was written goes to the kernel.
 */
@QuarkusTest
class ReplacesAsWrittenTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private static String system(String id, String replaces) {
        return """
        header:
          kind: "archicode.morin.io/system"
          version: "1"
        content:
          id: "%s"
          name: "%s"
        %s""".formatted(id, id, replaces);
    }

    /** Two plateaus: the mailer and the web site, then the postman, which says {@code replaces} as given, and the web site. */
    @SneakyThrows
    private Path workspace(String replaces) {
        Files.createDirectories(dir.resolve("plateaus/10_before"));
        Files.createDirectories(dir.resolve("plateaus/20_after"));
        Files.writeString(dir.resolve("plateaus/10_before/mailer.yaml"), system("mailer", ""));
        Files.writeString(dir.resolve("plateaus/10_before/web.yaml"), system("web", ""));
        Files.writeString(dir.resolve("plateaus/20_after/postman.yaml"), system("postman", replaces));
        Files.writeString(dir.resolve("plateaus/20_after/web.yaml"), system("web", ""));
        return Files.writeString(
            dir.resolve("workspace.yaml"),
            "settings:\n  plateaus:\n    - id: before\n      path: plateaus/10_before\n    - id: after\n      path: plateaus/20_after\n"
        );
    }

    /** Whether the table has a row for that element with that change. */
    private static boolean hasRow(String table, String change, String reference) {
        return table
            .lines()
            .anyMatch(line -> line.matches("^" + change + "\\s+element\\s+application\\s+" + reference + "\\s.*"));
    }

    private CliHarness.Result run(String... args) {
        return CliHarness.run(factory, errorOutput, args);
    }

    private CliHarness.Result diff(String replaces) {
        return run("-w", workspace(replaces).toString(), "diff");
    }

    @Test
    void aReferenceListedTwiceIsToldAndCountedOnce() {
        val result = diff("  replaces:\n    - \"mailer\"\n    - \"mailer\"\n");
        assertEquals(0, result.exit(), result.err());
        assertEquals(
            List.of("warning: replaces of postman (application layer) lists mailer twice, counted once"),
            result.err().lines().toList()
        );
        // counted once: the postman is the new place of the mailer, which is not removed
        assertTrue(hasRow(result.out(), "moved", "postman"), result.out());
        assertFalse(hasRow(result.out(), "removed", "mailer"), result.out());
    }

    @Test
    void anEntryThatIsNotAReferenceIsToldAndNotTakenForTheReferenceOfAnotherElement() {
        val result = diff("  replaces:\n    - \"mailer\"\n    - 12\n");
        assertEquals(0, result.exit(), result.err());
        assertEquals(
            List.of("warning: replaces of postman (application layer) has an entry that is not a reference, ignored"),
            result.err().lines().toList()
        );
        // the entry was no longer "12, which is not an element of the base plateau"; the mailer is still replaced
        assertFalse(result.err().contains("12"), result.err());
        assertTrue(hasRow(result.out(), "moved", "postman"), result.out());
    }

    @Test
    void aValueThatIsNotAListIsToldAndIgnored() {
        val result = diff("  replaces: \"mailer\"\n");
        assertEquals(0, result.exit(), result.err());
        assertEquals(
            List.of("warning: replaces of postman (application layer) is not a list of references, ignored"),
            result.err().lines().toList()
        );
        // ignored: nothing replaces the mailer, which is removed, and the postman is new
        assertTrue(hasRow(result.out(), "removed", "mailer"), result.out());
        assertTrue(hasRow(result.out(), "new", "postman"), result.out());
    }

    @Test
    void theWarningsAreOnTheErrorOutputOfViewsGenerateWithABaselineToo() {
        val result = run(
            "-w",
            workspace("  replaces:\n    - \"mailer\"\n    - \"mailer\"\n").toString(),
            "views",
            "generate",
            "--baseline",
            "before"
        );
        assertEquals(0, result.exit(), result.err());
        assertEquals(
            List.of("warning: replaces of postman (application layer) lists mailer twice, counted once"),
            result.err().lines().toList()
        );
        assertEquals("", result.out());
    }

    @Test
    void aReplacesThatIsWellWrittenSaysNothingAndNeitherDoesAnEmptyOne() {
        val well = diff("  replaces:\n    - \"mailer\"\n");
        assertEquals(0, well.exit(), well.err());
        assertEquals("", well.err());
        assertTrue(hasRow(well.out(), "moved", "postman"), well.out());

        // an empty list and no key are the same, as they always were
        val empty = diff("  replaces: []\n");
        val absent = diff("");
        assertEquals("", empty.err());
        assertEquals("", absent.err());
        assertEquals(absent.out(), empty.out());
        assertTrue(hasRow(absent.out(), "new", "postman"), absent.out());
    }
}

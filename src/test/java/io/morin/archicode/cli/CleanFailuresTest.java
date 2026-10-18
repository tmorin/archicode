package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UncheckedIOException;
import java.net.BindException;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AccessDeniedException;
import java.nio.file.FileSystemException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A command that fails prints a message on the error output and exits non-zero, with no stack trace (wave 010, D-5: the
 * exit code is 1 for a failure, picocli's own code (2) for a usage error). Every command that throws
 * {@link ArchiCodeException} is run here.
 */
@QuarkusTest
class CleanFailuresTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    CommandLine commandLineOfTheApplication;

    @TempDir
    Path dir;

    private CliHarness.Result run(String... args) {
        return CliHarness.run(factory, errorOutput, args);
    }

    private static String system(String id, String relationshipTo) {
        return """
        header:
          kind: "archicode.morin.io/system"
          version: "1"
        content:
          id: "%s"
          name: "%s"
        %s""".formatted(
            id,
            id,
            relationshipTo == null
                ? ""
                : "  relationships:\n    - destination: \"" + relationshipTo + "\"\n      label: \"uses\"\n"
        );
    }

    /** A workspace whose only system points at an element that does not exist. */
    @SneakyThrows
    private Path dangling() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/shop.yaml"), system("shop", "nowhere"));
        return Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
    }

    /** A workspace with two plateaus, whose plateaus are valid. */
    @SneakyThrows
    private Path withPlateaus() {
        Files.createDirectories(dir.resolve("plateaus/10_before"));
        Files.createDirectories(dir.resolve("plateaus/20_after"));
        Files.writeString(dir.resolve("plateaus/10_before/shop.yaml"), system("shop", null));
        Files.writeString(dir.resolve("plateaus/20_after/shop.yaml"), system("shop", null));
        return Files.writeString(
            dir.resolve("workspace.yaml"),
            "settings:\n  plateaus:\n    - id: before\n      path: plateaus/10_before\n    - id: after\n      path: plateaus/20_after\n"
        );
    }

    private static void assertOneLine(CliHarness.Result result, String expected) {
        assertEquals(1, result.exit(), result.err());
        assertEquals(List.of(expected), result.err().lines().toList(), result.err());
        assertFalse(result.err().contains("\tat "), "no stack trace: " + result.err());
        assertFalse(result.err().contains("Exception"), "no class name: " + result.err());
        assertEquals("", result.out());
    }

    @Test
    void viewsGenerateSaysWhichReferenceDanglesAndExitsWithOne() {
        val result = run("-w", dangling().toString(), "views", "generate");
        assertOneLine(result, "error: dangling reference: nowhere");
    }

    @Test
    void queryGraphSaysWhichReferenceDanglesAndExitsWithOne() {
        val result = run("-w", dangling().toString(), "query", "graph");
        assertOneLine(result, "error: unable to find the element nowhere");
    }

    @Test
    void queryViewsSaysWhichPlateauIsUnknown() {
        val result = run("-w", withPlateaus().toString(), "query", "views", "--plateau", "nope", "-f", "json");
        assertOneLine(result, "error: unknown plateau `nope`: the plateaus of this workspace are `before`, `after`");
    }

    @Test
    void viewsGenerateSaysWhichPlateauIsUnknown() {
        val result = run("-w", withPlateaus().toString(), "views", "generate", "--plateau", "nope");
        assertOneLine(result, "error: unknown plateau `nope`: the plateaus of this workspace are `before`, `after`");
    }

    @Test
    @SneakyThrows
    void diffSaysThereIsNothingToCompareWhenTheWorkspaceHasNoPlateaus() {
        val workspace = Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        val result = run("-w", workspace.toString(), "diff");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: the workspace declares no `settings.plateaus`"), result.err());
        assertFalse(result.err().contains("\tat "), result.err());
        assertEquals("", result.out());
    }

    @Test
    void diffSaysThatTheFirstPlateauHasNothingBeforeIt() {
        val result = run("-w", withPlateaus().toString(), "diff", "--plateau", "before");
        assertEquals(1, result.exit(), result.err());
        assertTrue(result.err().startsWith("error: the plateau `before` is the first plateau"), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
    }

    @Test
    void plateauAddSaysWhichPlateauItCopiesFromIsUnknown() {
        val result = run("-w", withPlateaus().toString(), "plateau", "add", "later", "--from", "nope");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: "), result.err());
        assertTrue(result.err().contains("nope"), result.err());
        assertFalse(result.err().contains("\tat "), result.err());
    }

    @Test
    @SneakyThrows
    void aManifestThatIsNotValidIsNamedWithTheLineAndTheColumn() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/shop.yaml"), "header: [\n");
        val workspace = Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        val result = run("-w", workspace.toString(), "views", "generate");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: `manifests/shop.yaml` is not valid: "), result.err());
        assertTrue(result.err().contains("(line 1, column"), result.err());
        assertFalse(result.err().contains("\tat "), result.err());
        assertFalse(result.err().contains("io.morin.archicode"), result.err());
    }

    @Test
    @SneakyThrows
    void aManifestWhoseContentIsNotAnElementNamesTheFileAndTheKey() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/shop.yaml"),
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  name: \"no id\"\n"
        );
        val workspace = Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        val result = run("-w", workspace.toString(), "query", "graph");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: `manifests/shop.yaml` is not valid: "), result.err());
        assertTrue(result.err().contains("id"), result.err());
        assertFalse(result.err().contains("\tat "), result.err());
    }

    @Test
    @SneakyThrows
    void aWorkspaceFileThatIsNotValidIsNamedToo() {
        val workspace = Files.writeString(dir.resolve("workspace.yaml"), "settings: [\n");
        val result = run("-w", workspace.toString(), "views", "generate");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: `workspace.yaml` is not valid: "), result.err());
    }

    @Test
    void aWorkspaceFileThatDoesNotExistIsSaidInOneLine() {
        val result = run("-w", dir.resolve("absent/workspace.yaml").toString(), "query", "graph");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().contains("does not exist"), result.err());
        assertFalse(result.err().contains("\tat "), result.err());
    }

    @Test
    @SneakyThrows
    void aMessageOfSeveralLinesHasTheMarkOnEachLine() {
        // two references declared twice: one line for each
        val workspace = withPlateaus();
        Files.writeString(dir.resolve("plateaus/20_after/again.yaml"), system("shop", null));
        Files.writeString(dir.resolve("plateaus/20_after/crm.yaml"), system("crm", null));
        Files.writeString(dir.resolve("plateaus/20_after/crm_again.yaml"), system("crm", null));
        val result = run("-w", workspace.toString(), "views", "generate");
        assertEquals(1, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .lines()
                .allMatch(line -> line.startsWith("error: ")),
            result.err()
        );
        assertEquals(2, result.err().lines().count(), result.err());
        assertTrue(result.err().contains("the reference `shop` is declared twice"), result.err());
        assertTrue(result.err().contains("the reference `crm` is declared twice"), result.err());
    }

    @Test
    void aUsageErrorKeepsThePicocliCodeAndItsOwnMessage() {
        val result = run("views", "generate", "--bogus");
        assertEquals(2, result.exit(), result.err());
        assertTrue(result.err().contains("Unknown option: '--bogus'"), result.err());
        assertFalse(result.err().contains("error: "), result.err());
    }

    @Test
    @SneakyThrows
    void aUsageErrorFoundWhileTheCommandRunsIsSaidAsPicocliSaysTheOthers() {
        // the editor opens a folder with a workspace.yaml: the check is made when the command runs
        val other = Files.writeString(dir.resolve("other.yaml"), "settings: {}\n");
        val result = run("-w", other.toString(), "editor", "serve");
        assertEquals(2, result.exit(), result.err());
        assertTrue(result.err().contains("the editor opens a folder with a workspace.yaml"), result.err());
        assertFalse(result.err().contains("\tat "), result.err());
    }

    @Test
    void theCommandLineOfTheApplicationHasTheErrorPath() {
        assertInstanceOf(ErrorOutput.class, commandLineOfTheApplication.getExecutionExceptionHandler());
    }

    @Test
    void aFailureThatIsNotOneTheAuthorCanActOnKeepsItsStackTrace() {
        assertNull(ErrorOutput.message(new IllegalStateException("a bug")));
        val err = new ByteArrayOutputStream();
        val commandLine = new CommandLine(ArchiCode.class, factory);
        commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
        val exit = assertDoesNotThrow(() ->
            errorOutput.handleExecutionException(new IllegalStateException("a bug"), commandLine, null)
        );
        assertEquals(1, exit);
        val text = err.toString(StandardCharsets.UTF_8);
        assertTrue(text.startsWith("error: unexpected java.lang.IllegalStateException: a bug"), text);
        assertTrue(text.contains("\tat "), text);
    }

    @Test
    void theKnownFailuresAreSaidInASentence() {
        assertEquals("a sentence", ErrorOutput.message(new ArchiCodeException("a sentence")));
        assertEquals(
            "a sentence",
            ErrorOutput.message(new IllegalStateException("wrapped", new ArchiCodeException("a sentence")))
        );
        assertEquals("`/x/y` does not exist", ErrorOutput.message(new NoSuchFileException("/x/y")));
    }

    @Test
    void theMostPreciseCauseIsTheOneThatIsSaid() {
        // a wrapper does not hide the file that is missing, whatever the wrapper is
        assertEquals(
            "`/x` does not exist",
            ErrorOutput.message(new UncheckedIOException(new IOException("wrapped", new NoSuchFileException("/x"))))
        );
        assertEquals(
            "`/x` cannot be accessed: permission denied",
            ErrorOutput.message(new IllegalStateException("wrapped", new AccessDeniedException("/x")))
        );
        // a file system failure of another kind says what it was, and the file
        assertEquals(
            "`/x` cannot be read or written: No space left on device",
            ErrorOutput.message(new FileSystemException("/x", null, "No space left on device"))
        );
        // a failure without a file or without a message is not printed as `null`
        assertEquals(
            "a file cannot be read or written: FileSystemException",
            ErrorOutput.message(new FileSystemException(null))
        );
        assertEquals("the server cannot listen: BindException", ErrorOutput.message(new BindException()));
        assertEquals(
            "the server cannot listen: Address already in use",
            ErrorOutput.message(new BindException("Address already in use"))
        );
        assertTrue(
            ErrorOutput.message(new MalformedInputException(1)).startsWith("a file is not valid text (UTF-8): ")
        );
        // a sentence of ours is the most precise of all
        assertEquals(
            "a sentence",
            ErrorOutput.message(new IOException("wrapped", new ArchiCodeException("a sentence", new Object[0])))
        );
    }

    @Test
    void anInputOutputFailureThatIsNotAboutAFileIsABugAndKeepsItsStackTrace() {
        assertNull(ErrorOutput.message(new IOException("a resource of the application cannot be read")));
        assertNull(ErrorOutput.message(new UncheckedIOException(new IOException("wrapped"))));
        assertNull(ErrorOutput.message(new IOException()));
    }

    static class Shape {

        public List<String> items;
    }

    @Test
    void aJsonFailureOutsideAManifestDoesNotSayThatAFileIsNamedAFile() {
        val failure = assertThrows(JsonProcessingException.class, () ->
            new ObjectMapper().readValue("{\"items\": \"text\"}", Shape.class)
        );
        val message = ErrorOutput.message(failure);
        assertTrue(message.startsWith("a file is not valid: "), message);
        assertFalse(message.contains("`a file`"), message);
    }

    @Test
    void aNumberWhereAListIsExpectedIsSaidAsTheWrongShapeWhateverItsKind() {
        val failure = assertThrows(JsonProcessingException.class, () ->
            new ObjectMapper().readValue("{\"items\": 1.5}", Shape.class)
        );
        assertEquals(
            "`shop.yaml` is not valid: the value has the wrong shape (found a number) at `items`",
            ArchiCodeException.unreadable("shop.yaml", failure, false).getMessage()
        );
        val integer = assertThrows(JsonProcessingException.class, () ->
            new ObjectMapper().readValue("{\"items\": 3}", Shape.class)
        );
        assertEquals(
            "`shop.yaml` is not valid: the value has the wrong shape (found a number) at `items`",
            ArchiCodeException.unreadable("shop.yaml", integer, false).getMessage()
        );
    }
}

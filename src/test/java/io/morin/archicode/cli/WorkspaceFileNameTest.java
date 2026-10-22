package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.morin.archicode.workspace.WorkspaceFileException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * The workspace file is {@code .archicode.yaml}, with no alias (wave 019, run 0144, #133, decision T9). A folder that
 * holds {@code workspace.yaml} and no {@code .archicode.yaml} is told with one sentence, the editor's word for word: the
 * cases are {@code workspace-file-name-cases.json}, which {@code workspace-file-name.test.js} runs on the editor.
 * {@code -w workspace.yaml} still works, since it names the file.
 */
@QuarkusTest
class WorkspaceFileNameTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/workspace-file-name-cases.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    EditorHttpServer editorHttpServer;

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    @SneakyThrows
    private static JsonNode document() {
        return new ObjectMapper().readTree(CASES.toFile());
    }

    static Stream<String> caseIds() {
        val ids = new java.util.ArrayList<String>();
        document()
            .get("cases")
            .forEach(c -> ids.add(c.get("id").asText()));
        return ids.stream();
    }

    private CliHarness.Result run(String... args) {
        return CliHarness.run(factory, errorOutput, args);
    }

    @SneakyThrows
    private JsonNode build(String id) {
        for (val c : document().get("cases")) {
            if (c.get("id").asText().equals(id)) {
                for (val file : c.get("files").properties()) {
                    Files.writeString(dir.resolve(file.getKey()), file.getValue().asText());
                }
                if (c.has("directories")) {
                    for (val directory : c.get("directories")) {
                        Files.createDirectories(dir.resolve(directory.asText()));
                    }
                }
                return c;
            }
        }
        throw new IllegalArgumentException(id);
    }

    @Test
    void shouldSaySameSentenceAsTheCaseFile() {
        assertEquals(document().get("sentence").asText(), WorkspaceFactory.FORMER_NAME_SENTENCE);
    }

    @ParameterizedTest
    @MethodSource("caseIds")
    void shouldRunTheCaseTheEditorRunsToo(String id) {
        val c = build(id);
        val result = run("-w", dir.resolve(".archicode.yaml").toString(), "query", "graph");
        if (c.get("expect").has("error")) {
            assertEquals(1, result.exit());
            assertEquals("error: " + document().get("sentence").asText() + "\n", result.err());
            assertEquals("", result.out());
        } else if (c.get("expect").has("loads")) {
            assertEquals(0, result.exit(), result.err());
        }
        // the cases that fail with another sentence (`expect.failure`) are run below, by their type
    }

    /**
     * The failure is typed (wave 020, run 0147, #146), the same three kinds the editor keeps apart: a workspace file that
     * cannot be had is a {@link WorkspaceFileException}, one that is read and found wrong is any other
     * {@link ArchiCodeException}, whatever file name its sentence holds.
     */
    @ParameterizedTest
    @MethodSource("caseIds")
    void shouldTypeTheFailureAsTheCaseFileSaysAndPrintItsMessageAsItIs(String id) {
        val c = build(id);
        val failure = c.get("expect").has("failure") ? c.get("expect").get("failure").asText() : null;
        val workspaceFile = dir.resolve(".archicode.yaml");
        if (failure == null) {
            assertEquals(0, run("-w", workspaceFile.toString(), "query", "graph").exit());
            return;
        }
        val thrown = assertThrows(ArchiCodeException.class, () -> workspaceFactory.plateauTree(workspaceFile));
        switch (failure) {
            case "unreadable" -> assertEquals(
                WorkspaceFileException.Reason.MISSING,
                assertInstanceOf(WorkspaceFileException.class, thrown).getReason()
            );
            case "renamed" -> assertEquals(
                WorkspaceFileException.Reason.FORMER_NAME,
                assertInstanceOf(WorkspaceFileException.class, thrown).getReason()
            );
            case "content" -> assertFalse(thrown instanceof WorkspaceFileException, thrown.getMessage());
            default -> throw new IllegalArgumentException(failure);
        }
        // the command line prints the message, and nothing of its own
        val result = run("-w", workspaceFile.toString(), "query", "graph");
        assertEquals(1, result.exit());
        assertEquals(
            thrown
                .getMessage()
                .lines()
                .map(line -> "error: " + line + "\n")
                .collect(java.util.stream.Collectors.joining()),
            result.err()
        );
    }

    @Test
    void shouldSayTheWordsItAlwaysSaidWhenTheFileIsMissingOrIsAFolder() {
        val workspaceFile = dir.resolve(".archicode.yaml");
        val missing = "error: the workspace file `" + workspaceFile + "` does not exist (`-w` names another one)\n";
        assertEquals(missing, run("-w", workspaceFile.toString(), "query", "graph").err());
        build("F05");
        assertEquals(missing, run("-w", workspaceFile.toString(), "views", "generate").err());
    }

    @Test
    @SneakyThrows
    void shouldTellAFileTheFileSystemRefusesInOneLineWithoutAStackTrace() {
        val workspaceFile = Files.writeString(dir.resolve(".archicode.yaml"), "settings: {}\n");
        org.junit.jupiter.api.Assumptions.assumeTrue(
            workspaceFile.toFile().setReadable(false) && !Files.isReadable(workspaceFile),
            "the file can be made unreadable (not as root)"
        );
        try {
            val expected = "error: the workspace file `" + workspaceFile + "` cannot be read: permission denied\n";
            for (val command : java.util.List.of(
                new String[] { "query", "graph" },
                new String[] { "views", "generate" },
                new String[] { "diff" },
                new String[] { "plateau", "list" }
            )) {
                val result = run(
                    java.util.stream.Stream.concat(
                        java.util.stream.Stream.of("-w", workspaceFile.toString()),
                        java.util.Arrays.stream(command)
                    ).toArray(String[]::new)
                );
                assertEquals(1, result.exit(), String.join(" ", command));
                assertEquals(expected, result.err(), String.join(" ", command));
                assertEquals("", result.out());
            }
            val thrown = assertThrows(WorkspaceFileException.class, () -> workspaceFactory.plateauTree(workspaceFile));
            assertEquals(WorkspaceFileException.Reason.UNREADABLE, thrown.getReason());
        } finally {
            assertTrue(workspaceFile.toFile().setReadable(true));
        }
    }

    /** A message that names {@code .archicode.yaml} for another reason is printed as it is: nothing is guessed from the name. */
    @Test
    void shouldPrintAMessageThatMentionsTheWorkspaceFileAsItIs() {
        for (val message : java.util.List.of(
            "`.archicode.yaml` is not valid: unknown key `foo` at `settings.foo`",
            "the path `../x` of `settings.manifests.paths` contains `..`: below the folder of .archicode.yaml",
            "the workspace file `/w/.archicode.yaml` was found wrong, and does not exist (`-w` names another one)"
        )) {
            assertEquals(message, ErrorOutput.message(new ArchiCodeException("%s", message)));
        }
        assertNotNull(ErrorOutput.message(WorkspaceFileException.formerName()));
        assertEquals(WorkspaceFactory.FORMER_NAME_SENTENCE, ErrorOutput.message(WorkspaceFileException.formerName()));
    }

    @Test
    void shouldStillReadTheFormerNameWhenAskedForByPath() {
        val c = build("F01");
        assertTrue(c.has("files"));
        val result = run("-w", dir.resolve("workspace.yaml").toString(), "query", "graph");
        assertEquals(0, result.exit(), result.err());
    }

    @Test
    void shouldSayNothingAboutTheFormerNameWhenTheFileIsAbsentAltogether() {
        val result = run("-w", dir.resolve(".archicode.yaml").toString(), "query", "graph");
        assertEquals(1, result.exit());
        assertTrue(result.err().contains("does not exist"), result.err());
        assertFalse(result.err().contains("workspace.yaml"), result.err());
    }

    @Test
    void shouldSayItToo_whenTheEditorIsServedFromAFolderThatWasNotRenamed() {
        build("F01");
        val result = run("-w", dir.resolve(".archicode.yaml").toString(), "editor", "serve", "--port", "0");
        assertEquals(1, result.exit());
        assertEquals("error: " + document().get("sentence").asText() + "\n", result.err());
    }

    @Test
    @SneakyThrows
    void shouldServeTheHiddenWorkspaceFileAtTheRootOnly() {
        Files.writeString(dir.resolve(".archicode.yaml"), "settings: {}\n");
        Files.createDirectories(dir.resolve("sub"));
        Files.writeString(dir.resolve("sub/.archicode.yaml"), "settings: {}\n");
        val running = editorHttpServer.start("127.0.0.1", 0, dir.resolve(".archicode.yaml"), java.util.Set.of());
        try {
            val client = java.net.http.HttpClient.newHttpClient();
            val base = "http://127.0.0.1:" + running.server().getAddress().getPort() + "/api/fs/";
            java.util.function.BiFunction<String, String, java.net.http.HttpResponse<String>> get = (route, path) -> {
                try {
                    return client.send(
                        java.net.http.HttpRequest.newBuilder(java.net.URI.create(base + route + "?path=" + path))
                            .header(EditorHttpServer.TOKEN_HEADER, running.token())
                            .build(),
                        java.net.http.HttpResponse.BodyHandlers.ofString()
                    );
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            };
            assertTrue(get.apply("list", "").body().contains("\".archicode.yaml\""));
            assertEquals(200, get.apply("file", ".archicode.yaml").statusCode());
            assertEquals("settings: {}\n", get.apply("file", ".archicode.yaml").body());
            assertEquals(400, get.apply("file", "sub/.archicode.yaml").statusCode());
            assertFalse(get.apply("list", "sub").body().contains(".archicode.yaml"));
        } finally {
            editorHttpServer.stop(running);
        }
    }
}

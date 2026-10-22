package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.workspace.WorkspaceFactory;
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
        } else {
            assertEquals(0, result.exit(), result.err());
        }
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

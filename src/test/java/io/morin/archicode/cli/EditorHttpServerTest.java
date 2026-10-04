package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Exercises {@link EditorHttpServer} over real HTTP (JDK {@link HttpClient}), against a temp-directory copy of
 * {@code src/test/workspaces/editor_manifests/} so write assertions never touch the committed fixture.
 */
@QuarkusTest
class EditorHttpServerTest {

    @Inject
    EditorHttpServer editorHttpServer;

    @Inject
    MapperFactory mapperFactory;

    HttpServer server;
    Path workspaceFilePath;
    HttpClient client = HttpClient.newHttpClient();

    @SneakyThrows
    @BeforeEach
    void startServer() {
        val tempDir = Files.createTempDirectory("editor_manifests");
        copyDirectory(Path.of("src/test/workspaces/editor_manifests"), tempDir);
        workspaceFilePath = tempDir.resolve("workspace.yaml");

        server = editorHttpServer.start("127.0.0.1", 0, workspaceFilePath);
    }

    @AfterEach
    void stopServer() {
        editorHttpServer.stop(server);
    }

    private String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @SneakyThrows
    private HttpResponse<String> get(String path) {
        val request = HttpRequest.newBuilder(URI.create(baseUrl() + path))
            .GET()
            .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    @SneakyThrows
    private HttpResponse<String> put(String path, byte[] body) {
        val request = HttpRequest.newBuilder(URI.create(baseUrl() + path))
            .PUT(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    @SneakyThrows
    private static void copyDirectory(Path source, Path target) {
        try (val stream = Files.walk(source)) {
            for (Path path : stream.sorted().toList()) {
                val destination = target.resolve(source.relativize(path));
                if (Files.isDirectory(path)) {
                    Files.createDirectories(destination);
                } else {
                    Files.copy(path, destination, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
    }

    @Test
    void shouldReturnThePlaceholderRoot() {
        val response = get("/");
        assertEquals(200, response.statusCode());
    }

    @SneakyThrows
    @Test
    void shouldServeTheEditorWebappAtRoot() {
        val response = get("/");
        assertEquals(200, response.statusCode());
        assertTrue(
            response.headers().firstValue("Content-Type").orElse("").contains("text/html"),
            "expected the root route to serve the HTML webapp, got Content-Type: " +
                response.headers().firstValue("Content-Type")
        );
    }

    @SneakyThrows
    @Test
    void shouldListTheConfiguredManifests() {
        val response = get("/api/manifests");
        assertEquals(200, response.statusCode());

        val tree = mapperFactory.create(MapperFormat.JSON).readTree(response.body());
        val manifests = tree.get("manifests");
        assertTrue(manifests.isArray() && manifests.size() >= 2, "expected both fixture manifests to be listed");

        var foundPerA = false;
        var foundSolA = false;
        for (val entry : manifests) {
            if ("manifests/per_a.yaml".equals(entry.get("path").asText())) {
                foundPerA = true;
                assertEquals("per_a", entry.get("reference").asText());
                // The mapper's NON_EMPTY serialization inclusion (MapperFactory) omits a null parseError entirely
                // rather than writing a literal JSON null, so its absence is the success signal here.
                assertTrue(entry.get("parseError") == null || entry.get("parseError").isNull());
            }
            if ("manifests/sol_a.yaml".equals(entry.get("path").asText())) {
                foundSolA = true;
                assertEquals("sol_a", entry.get("reference").asText());
                assertTrue(entry.get("parseError") == null || entry.get("parseError").isNull());
            }
        }
        assertTrue(foundPerA, "expected an entry for manifests/per_a.yaml");
        assertTrue(foundSolA, "expected an entry for manifests/sol_a.yaml");
    }

    @SneakyThrows
    @Test
    void shouldRejectNonGetMethodsOnTheManifestsListing() {
        val response = put("/api/manifests", "irrelevant".getBytes(StandardCharsets.UTF_8));
        assertEquals(405, response.statusCode());
    }

    @SneakyThrows
    @Test
    void shouldReturnTheResolvedGraph() {
        val response = get("/api/graph");
        assertEquals(200, response.statusCode());

        val tree = mapperFactory.create(MapperFormat.JSON).readTree(response.body());
        val elements = tree.get("elements");
        val relationships = tree.get("relationships");
        assertTrue(elements.isArray() && elements.size() >= 2, "expected both fixture elements to be indexed");
        assertTrue(
            relationships.isArray() && relationships.size() == 1,
            "expected the single per_a -> sol_a relationship declared in the fixture"
        );
    }

    @SneakyThrows
    @Test
    void shouldReturnTheWorkspaceAndManifestSchemas() {
        assertEquals(200, get("/api/schemas/workspace").statusCode());
        assertEquals(200, get("/api/schemas/manifest").statusCode());
        assertEquals(400, get("/api/schemas/unknown").statusCode());
    }

    @SneakyThrows
    @Test
    void shouldReturnTheRawManifestContent() {
        val response = get("/api/manifests/manifests/per_a.yaml");
        assertEquals(200, response.statusCode());

        val onDisk = Files.readString(workspaceFilePath.getParent().resolve("manifests/per_a.yaml"));
        assertEquals(onDisk, response.body());
    }

    @SneakyThrows
    @Test
    void shouldReturn404ForAMissingManifest() {
        assertEquals(404, get("/api/manifests/manifests/does_not_exist.yaml").statusCode());
    }

    @SneakyThrows
    @Test
    void shouldRejectAPathOutsideTheConfiguredManifestsDirectory() {
        assertEquals(400, get("/api/manifests/../workspace.yaml").statusCode());
        assertEquals(400, get("/api/manifests/../../etc/passwd").statusCode());
    }

    @SneakyThrows
    @Test
    void shouldPersistASchemaValidManifestWrite() {
        val target = workspaceFilePath.getParent().resolve("manifests/sol_a.yaml");
        val validPayload = """
        header:
          kind: "archicode.morin.io/solution"
          version: "1"
        content:
          id: "sol_a"
          name: "Solution A (updated)"
        """.getBytes(StandardCharsets.UTF_8);

        val response = put("/api/manifests/manifests/sol_a.yaml", validPayload);

        assertTrue(response.statusCode() >= 200 && response.statusCode() < 300, "expected a 2xx response");
        assertArrayEquals(validPayload, Files.readAllBytes(target));
    }

    @SneakyThrows
    @Test
    void shouldRejectASchemaInvalidManifestWriteAndWriteNothing() {
        val target = workspaceFilePath.getParent().resolve("manifests/sol_a.yaml");
        val before = Files.readAllBytes(target);

        // Missing the required content.id field (AbstractElement.id is @NonNull @JsonProperty(required = true)).
        val invalidPayload = """
        header:
          kind: "archicode.morin.io/solution"
          version: "1"
        content:
          name: "no id"
        """.getBytes(StandardCharsets.UTF_8);

        val response = put("/api/manifests/manifests/sol_a.yaml", invalidPayload);

        assertTrue(response.statusCode() >= 400 && response.statusCode() < 500, "expected a 4xx response");
        assertArrayEquals(before, Files.readAllBytes(target), "the file must be byte-identical to before the request");
    }

    @SneakyThrows
    @Test
    void shouldRejectAWriteOutsideTheConfiguredManifestsDirectory() throws IOException {
        // "/api/manifests/../escaped.yaml" resolves (relative to the workspace directory) to a sibling of the
        // workspace directory itself, not inside it — matching the server's own resolution of `..`.
        val outsideTarget = workspaceFilePath.getParent().getParent().resolve("escaped.yaml");
        val payload = """
        header:
          kind: "archicode.morin.io/solution"
          version: "1"
        content:
          id: "escaped"
        """.getBytes(StandardCharsets.UTF_8);

        val response = put("/api/manifests/../escaped.yaml", payload);

        assertTrue(response.statusCode() >= 400 && response.statusCode() < 500, "expected a 4xx response");
        assertTrue(Files.notExists(outsideTarget), "nothing must be written outside a configured manifests dir");
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.net.Socket;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Exercises {@link EditorHttpServer} over real HTTP against a temporary workspace: it serves the editor with its
 * token, gives the folder to the editor, and refuses what could turn a local server into a way to write elsewhere.
 */
@QuarkusTest
class EditorHttpServerTest {

    @Inject
    EditorHttpServer editorHttpServer;

    EditorHttpServer.Running running;
    Path folder;
    Path outside;
    HttpClient client = HttpClient.newHttpClient();

    @SneakyThrows
    @BeforeEach
    void start() {
        val base = Files.createTempDirectory("editor_server");
        folder = Files.createDirectories(base.resolve("architecture"));
        outside = Files.createDirectories(base.resolve("outside"));
        Files.writeString(folder.resolve("workspace.yaml"), "application: {}\n");
        Files.createDirectories(folder.resolve("manifests"));
        Files.writeString(folder.resolve("manifests/app.yaml"), "header: {kind: person}\n");
        Files.writeString(folder.resolve("notes.txt"), "not a manifest");
        Files.writeString(outside.resolve("secret.yaml"), "secret: true\n");
        running = editorHttpServer.start("127.0.0.1", 0, folder.resolve("workspace.yaml"), Set.of());
    }

    @AfterEach
    void stop() {
        editorHttpServer.stop(running);
    }

    private String base() {
        return "http://127.0.0.1:" + running.server().getAddress().getPort();
    }

    @SneakyThrows
    private HttpResponse<String> call(String method, String path, String body, String token, String origin) {
        val builder = HttpRequest.newBuilder(URI.create(base() + path));
        if (token != null) builder.header(EditorHttpServer.TOKEN_HEADER, token);
        if (origin != null) builder.header("Origin", origin);
        builder.method(
            method,
            body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)
        );
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private HttpResponse<String> api(String method, String route, String path, String body) {
        return call(
            method,
            "/api/fs/" + route + "?path=" + URLEncoder.encode(path, StandardCharsets.UTF_8),
            body,
            running.token(),
            null
        );
    }

    @Test
    void servesTheEditorWithTheTokenOfTheServer() {
        val response = call("GET", "/", null, null, null);
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("<meta name=\"archicode-server\" content=\"" + running.token() + "\">"));
        assertTrue(response.body().contains("viewpoint-kernel-wasm"), "it is the standalone editor");
        assertEquals("no-store", response.headers().firstValue("Cache-Control").orElse(""));
        assertEquals(404, call("GET", "/other", null, null, null).statusCode());
    }

    @Test
    void tellsWhichFolderIsServed() {
        val response = call("GET", "/api/fs/info", null, running.token(), null);
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"folder\":\"architecture\""));
    }

    @Test
    void listsTheEntriesOfADirectoryWithoutTheHiddenOnes() throws Exception {
        Files.createDirectories(folder.resolve(".git"));
        val root = api("GET", "list", "", null);
        assertEquals(200, root.statusCode());
        assertTrue(root.body().contains("\"name\":\"workspace.yaml\",\"kind\":\"file\""));
        assertTrue(root.body().contains("\"name\":\"manifests\",\"kind\":\"directory\""));
        assertFalse(root.body().contains(".git"));
        assertTrue(api("GET", "list", "manifests", null).body().contains("app.yaml"));
        assertEquals(404, api("GET", "list", "nowhere", null).statusCode());
    }

    @Test
    void readsWritesAndDeletesAFile() throws Exception {
        val read = api("GET", "file", "manifests/app.yaml", null);
        assertEquals("header: {kind: person}\n", read.body());
        assertEquals(
            String.valueOf(Files.getLastModifiedTime(folder.resolve("manifests/app.yaml")).toMillis()),
            read.headers().firstValue(EditorHttpServer.MODIFIED_HEADER).orElse(""),
            "the editor tells a file changed on disk by this time"
        );

        val created = api("PUT", "file", "manifests/new/app.platform.yaml", "header: {kind: system}\n");
        assertEquals(201, created.statusCode(), "a new file, in a directory that did not exist");
        assertEquals("header: {kind: system}\n", Files.readString(folder.resolve("manifests/new/app.platform.yaml")));

        assertEquals(200, api("PUT", "file", "manifests/app.yaml", "header: {kind: container}\n").statusCode());
        assertEquals("header: {kind: container}\n", Files.readString(folder.resolve("manifests/app.yaml")));

        assertEquals(200, api("DELETE", "file", "manifests/new/app.platform.yaml", null).statusCode());
        assertFalse(Files.exists(folder.resolve("manifests/new/app.platform.yaml")));
        assertEquals(404, api("DELETE", "file", "manifests/new/app.platform.yaml", null).statusCode());
        assertEquals(404, api("GET", "file", "manifests/missing.yaml", null).statusCode());
    }

    @Test
    void refusesACallWithoutTheTokenOrFromAnotherOrigin() {
        assertEquals(401, call("GET", "/api/fs/info", null, null, null).statusCode());
        assertEquals(401, call("GET", "/api/fs/info", null, "wrong", null).statusCode());
        assertEquals(403, call("GET", "/api/fs/info", null, running.token(), "https://evil.example").statusCode());
        assertEquals(200, call("GET", "/api/fs/info", null, running.token(), base()).statusCode());
        assertEquals(401, call("PUT", "/api/fs/file?path=manifests/app.yaml", "x: 1", null, null).statusCode());
        assertEquals("header: {kind: person}\n", readQuietly("manifests/app.yaml"), "nothing was written");
    }

    @Test
    void refusesAHostNameThatIsNotLoopbackUnlessAllowed() {
        assertEquals(403, status(rawGet("/", "attacker.example:48080")));
        assertEquals(403, status(rawGet("/api/fs/info", "attacker.example")));
        assertEquals(200, status(rawGet("/", "localhost:48080")));
        assertEquals(200, status(rawGet("/", "127.0.0.1")));
        editorHttpServer.stop(running);
        running = editorHttpServer.start("127.0.0.1", 0, folder.resolve("workspace.yaml"), Set.of("Editor.Example"));
        assertEquals(200, status(rawGet("/", "editor.example:80")), "a host given with --allowed-host");
    }

    @Test
    void refusesWhatLeavesTheFolderOrIsNotAManifest() throws Exception {
        assertEquals(400, api("GET", "file", "../outside/secret.yaml", null).statusCode());
        assertEquals(400, api("PUT", "file", "manifests/../../outside/new.yaml", "x: 1").statusCode());
        assertFalse(Files.exists(outside.resolve("new.yaml")));
        assertEquals(400, api("GET", "file", "/etc/passwd.yaml", null).statusCode());
        assertEquals(400, api("GET", "file", ".git/config.yaml", null).statusCode(), "a hidden segment");
        assertEquals(400, api("GET", "file", "notes.txt", null).statusCode(), "only the files the editor edits");
        assertEquals(400, api("PUT", "file", "run.sh", "x").statusCode());
        assertEquals(400, api("GET", "file", "", null).statusCode());
        assertEquals(400, api("GET", "list", "../outside", null).statusCode());
    }

    @Test
    void doesNotFollowALinkOutOfTheFolder() throws Exception {
        try {
            Files.createSymbolicLink(folder.resolve("manifests/link"), outside);
            Files.createSymbolicLink(folder.resolve("manifests/leak.yaml"), outside.resolve("secret.yaml"));
        } catch (UnsupportedOperationException | java.io.IOException e) {
            return; // no symbolic links here
        }
        assertEquals(403, api("GET", "file", "manifests/leak.yaml", null).statusCode());
        assertEquals(403, api("PUT", "file", "manifests/link/new.yaml", "x: 1").statusCode());
        assertFalse(Files.exists(outside.resolve("new.yaml")));
        assertEquals(403, api("PUT", "file", "manifests/link/deeper/new.yaml", "x: 1").statusCode());
        assertFalse(Files.exists(outside.resolve("deeper")), "nothing is created through the link");
        assertFalse(api("GET", "list", "manifests", null).body().contains("link"), "a link out is not listed");
    }

    @SneakyThrows
    private String readQuietly(String relative) {
        return Files.readString(folder.resolve(relative));
    }

    /** A request with the Host header of our choice, which the JDK client does not allow. */
    @SneakyThrows
    private String rawGet(String path, String host) {
        try (val socket = new Socket("127.0.0.1", running.server().getAddress().getPort())) {
            socket
                .getOutputStream()
                .write(
                    ("GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n").getBytes(
                        StandardCharsets.UTF_8
                    )
                );
            socket.getOutputStream().flush();
            val buffer = new ByteArrayOutputStream();
            socket.getInputStream().transferTo(buffer);
            return buffer.toString(StandardCharsets.UTF_8);
        }
    }

    private int status(String rawResponse) {
        return Integer.parseInt(rawResponse.split(" ")[1]);
    }
}

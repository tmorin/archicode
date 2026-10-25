package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayInputStream;
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
import java.util.Locale;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assumptions;
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

    @ConfigProperty(name = "quarkus.application.version", defaultValue = "dev")
    String version;

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
        Files.writeString(folder.resolve(".archicode.yaml"), "application: {}\n");
        Files.createDirectories(folder.resolve("manifests"));
        Files.writeString(folder.resolve("manifests/app.yaml"), "header: {kind: person}\n");
        Files.writeString(folder.resolve("notes.txt"), "not a manifest");
        Files.writeString(outside.resolve("secret.yaml"), "secret: true\n");
        running = editorHttpServer.start("127.0.0.1", 0, folder.resolve(".archicode.yaml"), Set.of());
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
        val response = call("GET", "/?token=" + running.token(), null, null, null);
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("<meta name=\"archicode-server\" content=\"" + running.token() + "\">"));
        assertTrue(response.body().contains("viewpoint-kernel-wasm"), "it is the standalone editor");
        assertTrue(
            response.body().contains("<meta name=\"archicode-version\" content=\"" + version + "\">"),
            "the page says which ArchiCode serves it"
        );
        assertEquals("no-store", response.headers().firstValue("Cache-Control").orElse(""));
        assertEquals(404, call("GET", "/other", null, null, null).statusCode());
    }

    @Test
    void doesNotReleaseTheEditorWithoutTheTokenOfTheServer() {
        for (val path : new String[] { "/", "/?token=", "/?token=wrong", "/index.html?other=1" }) {
            val response = call("GET", path, null, null, null);
            assertEquals(403, response.statusCode(), path);
            assertFalse(response.body().contains(running.token()));
            assertFalse(response.body().contains("viewpoint-kernel-wasm"));
        }
        assertEquals(400, status(rawGet("/?token=%zz", "127.0.0.1")), "malformed escape");
        assertTrue(call("GET", "/", null, null, null).body().contains("archicode editor serve"));
        assertEquals(200, call("GET", "/index.html?token=" + running.token(), null, null, null).statusCode());
    }

    @Test
    void letsAReloadInWithTheSessionCookieOnly() {
        val page = "/?token=" + running.token();
        val first = rawGet(page, "127.0.0.1");
        val cookie = first
            .lines()
            .filter(l -> l.toLowerCase(Locale.ROOT).startsWith("set-cookie:"))
            .findFirst()
            .orElseThrow()
            .substring("set-cookie:".length())
            .trim();
        assertEquals(
            EditorHttpServer.SESSION_COOKIE + "=" + running.token() + "; HttpOnly; SameSite=Strict; Path=/",
            cookie
        );

        val session = "Cookie: other=1; " + EditorHttpServer.SESSION_COOKIE + "=" + running.token() + "\r\n";
        val reload = rawGet("/", "127.0.0.1", session);
        assertEquals(200, status(reload), "the cookie alone opens the page");
        assertTrue(reload.contains("viewpoint-kernel-wasm"));
        assertFalse(reload.toLowerCase(Locale.ROOT).contains("set-cookie"), "only the token in the address sets it");

        assertEquals(403, status(rawGet("/", "127.0.0.1")), "no token, no cookie");
        assertEquals(
            403,
            status(rawGet("/", "127.0.0.1", "Cookie: " + EditorHttpServer.SESSION_COOKIE + "=wrong\r\n"))
        );
        assertEquals(403, status(rawGet("/", "127.0.0.1", "Cookie: other=" + running.token() + "\r\n")));
        assertEquals(403, status(rawGet("/", "attacker.example", session)), "the host is still checked");
        assertEquals(401, status(rawGet("/api/fs/info", "127.0.0.1", session)), "the cookie does not open the API");
        assertFalse(first.toLowerCase(Locale.ROOT).contains("set-cookie: wrong"));
        assertFalse(rawGet("/", "127.0.0.1").toLowerCase(Locale.ROOT).contains("set-cookie"), "refusals set none");
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
        assertTrue(root.body().contains("\"name\":\".archicode.yaml\",\"kind\":\"file\""));
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
        val page = "/?token=" + running.token();
        assertEquals(403, status(rawGet(page, "attacker.example:48080")), "the token does not open every host");
        assertEquals(200, status(rawGet(page, "localhost:48080")));
        assertEquals(200, status(rawGet(page, "127.0.0.1")));
        assertEquals(200, status(rawGet(page, "LOCALHOST.:48080")), "a trailing dot is the same name");
        assertEquals(200, status(rawGet(page, "[::1]:48080")));
        editorHttpServer.stop(running);
        running = editorHttpServer.start(
            "127.0.0.1",
            0,
            folder.resolve(".archicode.yaml"),
            Set.of("Editor.Example", "other.example:8080", "dotted.example.")
        );
        val allowedPage = "/?token=" + running.token();
        assertEquals(200, status(rawGet(allowedPage, "editor.example:80")), "a host given with --allowed-host");
        assertEquals(200, status(rawGet(allowedPage, "other.example")), "the port of a configured host is ignored");
        assertEquals(200, status(rawGet(allowedPage, "dotted.example:8080")), "so is its trailing dot");
        assertEquals(403, status(rawGet(allowedPage, "attacker.example")));
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
    void saysWhichEntriesAreLinksSoThatTheEditorDoesNotFollowThemWhenItReadsManifestsRecursively() throws Exception {
        try {
            Files.createSymbolicLink(folder.resolve("manifests/loop"), folder.resolve("manifests"));
        } catch (UnsupportedOperationException | java.io.IOException e) {
            return; // no symbolic links here
        }
        val body = api("GET", "list", "manifests", null).body();
        assertTrue(body.contains("\"name\":\"loop\",\"kind\":\"directory\",\"link\":true"), body);
        assertFalse(
            body.contains("\"name\":\"app.yaml\",\"kind\":\"file\",\"link\""),
            "a file that is not a link says nothing of links"
        );
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

    @Test
    void refusesALinkAsAFileEvenWhenItDangles() throws Exception {
        try {
            Files.createSymbolicLink(folder.resolve("manifests/dangling.yaml"), outside.resolve("created.yaml"));
            Files.createSymbolicLink(folder.resolve("manifests/inside.yaml"), folder.resolve("manifests/app.yaml"));
            Files.createSymbolicLink(folder.resolve("manifests/dangling-dir"), outside.resolve("nowhere"));
        } catch (UnsupportedOperationException | java.io.IOException e) {
            return; // no symbolic links here
        }
        assertEquals(403, api("PUT", "file", "manifests/dangling.yaml", "x: 1").statusCode());
        assertFalse(Files.exists(outside.resolve("created.yaml")), "nothing is written through the dangling link");
        assertEquals(403, api("GET", "file", "manifests/dangling.yaml", null).statusCode());
        assertEquals(403, api("DELETE", "file", "manifests/dangling.yaml", null).statusCode());
        assertTrue(Files.isSymbolicLink(folder.resolve("manifests/dangling.yaml")), "the link is left alone");
        assertEquals(403, api("PUT", "file", "manifests/inside.yaml", "x: 1").statusCode(), "even inside the folder");
        assertEquals("header: {kind: person}\n", readQuietly("manifests/app.yaml"));
        assertEquals(403, api("PUT", "file", "manifests/dangling-dir/new.yaml", "x: 1").statusCode());
        assertFalse(Files.exists(outside.resolve("nowhere")), "no directory is created through a dangling link");
    }

    @Test
    void writesAtomicallyAndLeavesNoTemporaryFile() throws Exception {
        assertEquals(200, api("PUT", "file", "manifests/app.yaml", "a: 1\n").statusCode());
        assertEquals(201, api("PUT", "file", "manifests/other.yaml", "b: 2\n").statusCode());
        try (val stream = Files.list(folder.resolve("manifests"))) {
            assertEquals(2, stream.count(), "app.yaml and other.yaml only");
        }
    }

    @Test
    void refusesABodyThatIsTooLargeOrNotUtf8() throws Exception {
        editorHttpServer.stop(running);
        running = editorHttpServer.start("127.0.0.1", 0, folder.resolve(".archicode.yaml"), Set.of(), 16);
        assertEquals(201, api("PUT", "file", "manifests/small.yaml", "a".repeat(16)).statusCode(), "at the limit");
        assertEquals(413, api("PUT", "file", "manifests/big.yaml", "a".repeat(17)).statusCode(), "by its length");
        val chunked = HttpRequest.newBuilder(URI.create(base() + "/api/fs/file?path=manifests/big.yaml"))
            .header(EditorHttpServer.TOKEN_HEADER, running.token())
            .PUT(HttpRequest.BodyPublishers.ofInputStream(() -> new ByteArrayInputStream(new byte[17])))
            .build();
        assertEquals(413, client.send(chunked, HttpResponse.BodyHandlers.ofString()).statusCode(), "without a length");
        assertFalse(Files.exists(folder.resolve("manifests/big.yaml")));

        val request = HttpRequest.newBuilder(URI.create(base() + "/api/fs/file?path=manifests/app.yaml"))
            .header(EditorHttpServer.TOKEN_HEADER, running.token())
            .PUT(HttpRequest.BodyPublishers.ofByteArray(new byte[] { 'a', ':', ' ', (byte) 0xE9, '\n' })) // latin-1 é
            .build();
        assertEquals(400, client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
        assertEquals("header: {kind: person}\n", readQuietly("manifests/app.yaml"), "nothing was written");
        assertEquals(200, api("PUT", "file", "manifests/app.yaml", "name: é\n").statusCode());
        assertEquals("name: é\n", readQuietly("manifests/app.yaml"));
        assertTrue(
            api("GET", "file", "manifests/app.yaml", null)
                .headers()
                .firstValue("Content-Type")
                .orElse("")
                .contains("utf-8")
        );
    }

    @Test
    void answersABadRequestWithoutLeakingThePathOfTheServer() throws Exception {
        val token = EditorHttpServer.TOKEN_HEADER + ": " + running.token() + "\r\n";
        assertEquals(400, status(rawGet("/api/fs/file?path=%zz", "127.0.0.1", token)), "malformed escape");
        assertEquals(400, status(rawGet("/api/fs/list?path=%", "127.0.0.1", token)));

        Files.createDirectories(folder.resolve("manifests/dir.yaml"));
        val directory = api("PUT", "file", "manifests/dir.yaml", "x: 1");
        assertEquals(409, directory.statusCode(), "a directory is in the way");
        val parent = api("PUT", "file", "manifests/app.yaml/deeper/new.yaml", "x: 1");
        assertEquals(409, parent.statusCode(), "a file is where a directory should be");
        assertEquals(409, api("PUT", "file", "manifests/app.yaml/new.yaml", "x: 1").statusCode());
        for (val response : new HttpResponse<?>[] { directory, parent }) {
            assertFalse(String.valueOf(response.body()).contains(folder.toString()), "no absolute path");
        }
    }

    @SneakyThrows
    private String readQuietly(String relative) {
        return Files.readString(folder.resolve(relative));
    }

    /** A request with the Host header of our choice, which the JDK client does not allow. */
    @SneakyThrows
    private String rawGet(String path, String host) {
        return rawGet(path, host, "");
    }

    @SneakyThrows
    private String rawGet(String path, String host, String extraHeaders) {
        try (val socket = new Socket("127.0.0.1", running.server().getAddress().getPort())) {
            socket
                .getOutputStream()
                .write(
                    (
                        "GET " +
                        path +
                        " HTTP/1.1\r\nHost: " +
                        host +
                        "\r\n" +
                        extraHeaders +
                        "Connection: close\r\n\r\n"
                    ).getBytes(StandardCharsets.UTF_8)
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

    @Test
    void refusesAMethodThatTheRouteDoesNotTake() {
        assertEquals(405, call("POST", "/?token=" + running.token(), "x", null, null).statusCode());
        assertEquals("method not allowed", call("POST", "/?token=" + running.token(), "x", null, null).body());
        assertEquals("method not allowed", api("POST", "info", "", "x").body());
        assertEquals("method not allowed", api("PUT", "list", "", "x").body());
        val file = api("POST", "file", "manifests/app.yaml", "x: 1");
        assertEquals(405, file.statusCode());
        assertEquals("method not allowed", file.body());
        assertEquals("header: {kind: person}\n", readQuietly("manifests/app.yaml"), "nothing was written");
    }

    @Test
    void saysWhichRouteIsUnknown() {
        val response = call("GET", "/api/fs/nothing?path=a", null, running.token(), null);
        assertEquals(404, response.statusCode());
        assertEquals("unknown route: nothing", response.body());
        assertEquals(404, call("GET", "/api/fs/", null, running.token(), null).statusCode());
    }

    @Test
    void answersAnEmptyFileWithAnEmptyBody() throws Exception {
        Files.writeString(folder.resolve("manifests/empty.yaml"), "");
        val response = api("GET", "file", "manifests/empty.yaml", null);
        assertEquals(200, response.statusCode());
        assertEquals("", response.body());
        assertTrue(response.headers().firstValue(EditorHttpServer.MODIFIED_HEADER).isPresent());

        // and it takes an empty body as a file
        assertEquals(201, api("PUT", "file", "manifests/created-empty.yaml", "").statusCode());
        assertEquals("", readQuietly("manifests/created-empty.yaml"));
    }

    @Test
    void failsWithoutSayingWhyWhenTheFileCannotBeRead() throws Exception {
        val locked = folder.resolve("manifests/locked.yaml");
        Files.writeString(locked, "secret: true\n");
        locked.toFile().setReadable(false, false);
        try {
            Assumptions.assumeFalse(Files.isReadable(locked), "this user reads a file whatever its mode");
            val response = api("GET", "file", "manifests/locked.yaml", null);
            assertEquals(500, response.statusCode());
            assertEquals("the editor server failed, see its log", response.body());
            assertFalse(response.body().contains(folder.toString()), "no absolute path");
        } finally {
            locked.toFile().setReadable(true, false);
        }
    }
}

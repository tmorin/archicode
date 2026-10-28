package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.EXAMPLES;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@code editor serve} of the packaged application: it starts, prints its address, answers one request with the editor page
 * (a resource of the jar and of the native image) and stops.
 *
 * <p>The application stays up until it is stopped, which {@code QuarkusMainLauncher} (it waits for the end of the process)
 * cannot do, so the test starts the same artifact the extension launches, as the build wrote it in
 * {@code target/quarkus-artifact.properties}: {@code java -jar} for a jar, the runner for a native image. It takes a free
 * port from the application ({@code --port 0}), waits a bounded time for the address and says what the application printed
 * when it does not come.
 */
class EditorServeIT {

    private static final Duration START_TIMEOUT = Duration.ofSeconds(90);
    private static final Duration STOP_TIMEOUT = Duration.ofSeconds(20);
    private static final Pattern ADDRESS = Pattern.compile("http://127\\.0\\.0\\.1:(\\d+)/\\?token=([0-9a-zA-Z_-]+)");

    @TempDir
    Path dir;

    /** The command that runs the packaged application, from the artifact of the build. */
    @SneakyThrows
    private static List<String> command() {
        val properties = new Properties();
        try (InputStream in = Files.newInputStream(Path.of("target/quarkus-artifact.properties"))) {
            properties.load(in);
        }
        val artifact = Path.of("target").resolve(properties.getProperty("path", "")).toAbsolutePath();
        assertTrue(Files.isRegularFile(artifact), () -> "the packaged application is not at " + artifact);
        val command = new ArrayList<String>();
        switch (properties.getProperty("type", "")) {
            case "jar" -> {
                command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
                command.add("-jar");
                command.add(artifact.toString());
            }
            case "native" -> command.add(artifact.toString());
            default -> fail(
                "the artifact is of type " + properties.getProperty("type") + ", not a jar or a native image"
            );
        }
        return command;
    }

    @SneakyThrows
    @Test
    void servesTheEditorAndStops() {
        val folder = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "workspace");
        val log = dir.resolve("editor.log");
        val command = command();
        command.addAll(List.of("-w", workspace(folder), "editor", "serve", "--host", "127.0.0.1", "--port", "0"));
        val process = new ProcessBuilder(command)
            .redirectErrorStream(true)
            .redirectOutput(log.toFile())
            .directory(dir.toFile())
            .start();
        try (var client = HttpClient.newHttpClient()) {
            val address = awaitAddress(process, log);
            val base = "http://127.0.0.1:" + address.group(1) + "/";

            val page = get(client, base + "?token=" + address.group(2));
            assertEquals(200, page.statusCode(), () -> "the editor page: " + page.body());
            assertTrue(page.body().contains("<html"), () -> "not the editor page: " + page.body());
            assertTrue(page.body().contains("viewpoint-kernel-wasm"), "it is the standalone editor, with the kernel");

            assertTrue(page.body().contains("<link rel=\"icon\""), "the page declares its own icon");

            val icon = get(client, base + "favicon.ico");
            assertEquals(204, icon.statusCode(), "the icon a browser asks for is answered, without a token and a 404");
            assertEquals("", icon.body(), "the icon route has no body");

            val refused = get(client, base);
            assertEquals(403, refused.statusCode(), "the page is not served without the token");

            // the sample of the hosted editor is a resource of the jar and of the native image, served with the proof
            val sample = Files.readString(Path.of("src/main/resources/editor-webapp/samples/brightcart.yaml"));
            val served = get(client, base + "samples/brightcart.yaml", address.group(2));
            assertEquals(200, served.statusCode(), () -> "the sample: " + served.body());
            assertEquals(sample, served.body(), "the bytes of the committed sample");
            assertEquals(
                "text/yaml; charset=utf-8",
                served.headers().firstValue("Content-Type").orElse(""),
                "the sample is YAML text"
            );
            assertEquals(403, get(client, base + "samples/brightcart.yaml").statusCode(), "no proof, no sample");
            assertEquals(404, get(client, base + "samples/other.yaml", address.group(2)).statusCode());
        } finally {
            process.destroy();
            if (!process.waitFor(STOP_TIMEOUT.toSeconds(), java.util.concurrent.TimeUnit.SECONDS)) {
                process.destroyForcibly();
                fail(
                    "editor serve did not stop within " +
                        STOP_TIMEOUT.toSeconds() +
                        " s of a termination signal\n" +
                        Files.readString(log)
                );
            }
        }
    }

    /** Polls the output of the application until it says where it listens; a bounded wait that fails with what it printed. */
    @SneakyThrows
    private static java.util.regex.Matcher awaitAddress(Process process, Path log) {
        val deadline = System.nanoTime() + START_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            val text = readLog(log);
            val matcher = ADDRESS.matcher(text);
            if (matcher.find()) {
                return matcher;
            }
            if (!process.isAlive()) {
                fail(
                    "editor serve ended with exit code " +
                        process.exitValue() +
                        " before it printed its address\n" +
                        text
                );
            }
            Thread.sleep(200);
        }
        process.destroyForcibly();
        return fail("editor serve printed no address within " + START_TIMEOUT.toSeconds() + " s\n" + readLog(log));
    }

    private static String readLog(Path log) throws IOException {
        return Files.exists(log) ? Files.readString(log, StandardCharsets.UTF_8) : "";
    }

    @SneakyThrows
    private static HttpResponse<String> get(HttpClient client, String url) {
        val request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(30)).GET().build();
        return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    /** A GET that carries the token of the server in its header, as the page's own requests do. */
    @SneakyThrows
    private static HttpResponse<String> get(HttpClient client, String url, String token) {
        val request = HttpRequest.newBuilder(URI.create(url))
            .timeout(Duration.ofSeconds(30))
            .header("X-ArchiCode-Token", token)
            .GET()
            .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}

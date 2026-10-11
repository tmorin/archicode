package io.morin.archicode.cli;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * The local HTTP server behind {@code editor serve}: it serves the standalone editor ({@code standalone.html}) and
 * gives it the folder of the workspace, so that the page opens it by itself, in any browser, without the File System
 * Access API.
 * <p>
 * Routes:
 * <ul>
 *   <li>{@code GET /} — the editor, with the token of this server in a {@code <meta name="archicode-server">}.</li>
 *   <li>{@code GET /api/fs/info} — the name of the folder served.</li>
 *   <li>{@code GET /api/fs/list?path=} — the entries of a directory of the folder ({@code name}, {@code kind}).</li>
 *   <li>{@code GET|PUT|DELETE /api/fs/file?path=} — read (with its last modification time in
 *       {@code X-ArchiCode-Modified}), write (parents are created) or delete a {@code .yaml}, {@code .yml} or
 *       {@code .json} file of the folder.</li>
 * </ul>
 * The API writes to the disk, and this server may listen on every address (that is what a Docker {@code -p} mapping
 * needs), so it does not trust the network: every {@code /api} call must carry the token (a page of another origin
 * cannot read it), the {@code Host} must be a loopback name or one given with {@code --allowed-host} (DNS rebinding),
 * a {@code Origin}, when present, must be the server itself, and a path can neither leave the folder, nor reach a
 * hidden entry, nor go through a symbolic link that leaves it.
 */
@Slf4j
@ApplicationScoped
public class EditorHttpServer {

    static final String TOKEN_HEADER = "X-ArchiCode-Token";

    /** The time a file was last modified on disk, in milliseconds: how the editor notices a file changed under it. */
    static final String MODIFIED_HEADER = "X-ArchiCode-Modified";

    private static final String API_PREFIX = "/api/fs/";
    private static final String WEBAPP_RESOURCE = "/editor-webapp/standalone.html";
    private static final String TOKEN_MARKER = "<head>";
    private static final String VERSION_MARKER = "<meta name=\"archicode-version\" content=\"dev\">";
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");
    private static final Set<String> EDITABLE_EXTENSIONS = Set.of("yaml", "yml", "json");
    private static final int HANDLER_THREADS = 4;

    @Inject
    MapperFactory mapperFactory;

    /** The release of this ArchiCode, which the editor shows in its help. */
    @ConfigProperty(name = "quarkus.application.version", defaultValue = "dev")
    String version;

    /**
     * Start the server.
     *
     * @param host              the address to bind to
     * @param port              the port to bind to (0 for an ephemeral port, used by tests)
     * @param workspaceFilePath the workspace file; its folder is the one the editor opens
     * @param allowedHosts      host names, besides the loopback ones, a request may be addressed to
     * @return the started, already-bound {@link Running} server
     */
    @SneakyThrows
    public Running start(
        @NonNull String host,
        int port,
        @NonNull Path workspaceFilePath,
        @NonNull Set<String> allowedHosts
    ) {
        val root = workspaceFilePath.toAbsolutePath().getParent().toRealPath();
        val token = newToken();
        val hosts = new java.util.HashSet<>(LOOPBACK_HOSTS);
        allowedHosts
            .stream()
            .map(h -> h.toLowerCase(Locale.ROOT))
            .forEach(hosts::add);

        val server = HttpServer.create(new InetSocketAddress(host, port), 0);
        server.setExecutor(Executors.newFixedThreadPool(HANDLER_THREADS));
        server.createContext("/", exchange -> handleRoot(exchange, token, hosts));
        server.createContext(API_PREFIX, exchange -> handleApi(exchange, root, token, hosts));
        server.start();
        log.info("editor http server listening on {}:{}", host, server.getAddress().getPort());
        return new Running(server, token);
    }

    /** A started server and the token its pages carry. */
    public record Running(HttpServer server, String token) {}

    /** Stop the server, releasing its port immediately and shutting down its handler pool. */
    public void stop(@NonNull Running running) {
        running.server().stop(0);
        if (running.server().getExecutor() instanceof ExecutorService executorService) {
            executorService.shutdownNow();
        }
    }

    private static String newToken() {
        val bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @SneakyThrows
    private void handleRoot(HttpExchange exchange, String token, Set<String> hosts) {
        if (!hostAllowed(exchange, hosts)) {
            text(exchange, 403, "this host name is not allowed: start the server with --allowed-host to serve it");
            return;
        }
        val path = exchange.getRequestURI().getPath();
        if (!"/".equals(path) && !"/index.html".equals(path)) {
            text(exchange, 404, "not found");
            return;
        }
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            text(exchange, 405, "method not allowed");
            return;
        }
        try (val stream = getClass().getResourceAsStream(WEBAPP_RESOURCE)) {
            if (stream == null) {
                text(exchange, 500, "the editor is missing from the classpath: " + WEBAPP_RESOURCE);
                return;
            }
            val html = new String(stream.readAllBytes(), StandardCharsets.UTF_8).replace(
                VERSION_MARKER,
                "<meta name=\"archicode-version\" content=\"" + version + "\">"
            );
            val meta = TOKEN_MARKER + "<meta name=\"archicode-server\" content=\"" + token + "\">";
            val index = html.indexOf(TOKEN_MARKER);
            val served =
                index < 0 ? html : html.substring(0, index) + meta + html.substring(index + TOKEN_MARKER.length());
            val headers = exchange.getResponseHeaders();
            headers.set("Cache-Control", "no-store");
            headers.set("Referrer-Policy", "no-referrer");
            headers.set("X-Content-Type-Options", "nosniff");
            write(exchange, 200, "text/html; charset=utf-8", served.getBytes(StandardCharsets.UTF_8));
        }
    }

    @SneakyThrows
    private void handleApi(HttpExchange exchange, Path root, String token, Set<String> hosts) {
        try {
            if (!hostAllowed(exchange, hosts)) {
                text(exchange, 403, "this host name is not allowed: start the server with --allowed-host to serve it");
                return;
            }
            if (!originAllowed(exchange)) {
                text(exchange, 403, "cross-origin requests are not accepted");
                return;
            }
            val given = exchange.getRequestHeaders().getFirst(TOKEN_HEADER);
            if (
                given == null ||
                !MessageDigest.isEqual(given.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))
            ) {
                text(exchange, 401, "missing or wrong token: reload the page served by this server");
                return;
            }
            val route = exchange.getRequestURI().getPath().substring(API_PREFIX.length());
            val method = exchange.getRequestMethod().toUpperCase(Locale.ROOT);
            val query = query(exchange);
            switch (route) {
                case "info" -> {
                    if (!"GET".equals(method)) text(exchange, 405, "method not allowed");
                    else json(exchange, 200, info(root));
                }
                case "list" -> {
                    if (!"GET".equals(method)) text(exchange, 405, "method not allowed");
                    else json(exchange, 200, list(root, query.getOrDefault("path", "")));
                }
                case "file" -> file(exchange, root, method, query.getOrDefault("path", ""));
                default -> text(exchange, 404, "unknown route: " + route);
            }
        } catch (Refusal e) {
            text(exchange, e.status, e.getMessage());
        } catch (Exception e) {
            log.warn("the editor server failed on {}", exchange.getRequestURI(), e);
            text(exchange, 500, String.valueOf(e.getMessage()));
        }
    }

    private Object info(Path root) {
        val node = JsonNodeFactory.instance.objectNode();
        node.put("folder", String.valueOf(root.getFileName()));
        return node;
    }

    @SneakyThrows
    private Object list(Path root, String relative) {
        val directory = resolve(root, relative, false);
        if (!Files.isDirectory(directory)) {
            throw new Refusal(404, "not a directory: " + relative);
        }
        val entries = JsonNodeFactory.instance.arrayNode();
        try (val stream = Files.list(directory)) {
            val sorted = stream
                .filter(p -> !p.getFileName().toString().startsWith("."))
                .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                .toList();
            for (Path entry : sorted) {
                if (!stayInside(root, entry)) continue; // a link out of the folder is not part of it
                val node = entries.addObject();
                node.put("name", entry.getFileName().toString());
                node.put("kind", Files.isDirectory(entry) ? "directory" : "file");
            }
        }
        return entries;
    }

    @SneakyThrows
    private void file(HttpExchange exchange, Path root, String method, String relative) {
        val target = resolve(root, relative, true);
        switch (method) {
            case "GET" -> {
                if (!Files.isRegularFile(target)) throw new Refusal(404, "not found: " + relative);
                exchange
                    .getResponseHeaders()
                    .set(MODIFIED_HEADER, String.valueOf(Files.getLastModifiedTime(target).toMillis()));
                write(exchange, 200, "text/plain; charset=utf-8", Files.readAllBytes(target));
            }
            case "PUT" -> {
                val bytes = exchange.getRequestBody().readAllBytes();
                val existed = Files.exists(target);
                Files.createDirectories(target.getParent());
                // the parent now exists: check again that it, and the file if any, are still inside the folder
                if (!stayInside(root, target.getParent()) || (existed && !stayInside(root, target))) {
                    throw new Refusal(403, "path leaves the folder: " + relative);
                }
                Files.write(target, bytes);
                text(exchange, existed ? 200 : 201, "ok");
            }
            case "DELETE" -> {
                if (!Files.isRegularFile(target)) throw new Refusal(404, "not found: " + relative);
                Files.delete(target);
                text(exchange, 200, "ok");
            }
            default -> text(exchange, 405, "method not allowed");
        }
    }

    /**
     * The path of a request, inside the folder or refused: relative, no {@code ..}, no hidden segment, no link that
     * leaves the folder, and for a file, one of the extensions the editor edits.
     */
    private Path resolve(Path root, String relative, boolean isFile) {
        if (relative.contains("\u0000") || relative.startsWith("/") || relative.contains("\\")) {
            throw new Refusal(400, "invalid path");
        }
        val segments = new ArrayList<String>();
        for (String segment : relative.split("/")) {
            if (segment.isEmpty() || ".".equals(segment)) continue;
            if ("..".equals(segment) || segment.startsWith(".")) {
                throw new Refusal(400, "path is not allowed: " + relative);
            }
            segments.add(segment);
        }
        if (isFile) {
            if (segments.isEmpty()) throw new Refusal(400, "missing file path");
            val name = segments.get(segments.size() - 1);
            val dot = name.lastIndexOf('.');
            val extension = dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
            if (!EDITABLE_EXTENSIONS.contains(extension)) {
                throw new Refusal(400, "only .yaml, .yml and .json files can be reached: " + name);
            }
        }
        val target = root.resolve(String.join("/", segments)).normalize();
        // the closest part of the path that exists decides where a link would take it: check it before anything is created
        var existing = target;
        while (!Files.exists(existing) && existing.getParent() != null) existing = existing.getParent();
        if (!target.startsWith(root) || !stayInside(root, existing)) {
            throw new Refusal(403, "path leaves the folder: " + relative);
        }
        return target;
    }

    @SneakyThrows
    private boolean stayInside(Path root, Path path) {
        return !Files.exists(path) || path.toRealPath().startsWith(root);
    }

    private boolean hostAllowed(HttpExchange exchange, Set<String> hosts) {
        val header = exchange.getRequestHeaders().getFirst("Host");
        if (header == null) return false;
        val lower = header.toLowerCase(Locale.ROOT);
        val name = lower.startsWith("[")
            ? lower.substring(0, lower.indexOf(']') + 1)
            : lower.replaceFirst(":\\d+$", "");
        return hosts.contains(name);
    }

    private boolean originAllowed(HttpExchange exchange) {
        val origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin == null) return true; // a request of the page itself carries none on a same-origin GET
        val host = exchange.getRequestHeaders().getFirst("Host");
        return host != null && (origin.equals("http://" + host) || origin.equals("https://" + host));
    }

    private Map<String, String> query(HttpExchange exchange) {
        val result = new HashMap<String, String>();
        val raw = exchange.getRequestURI().getRawQuery();
        if (raw == null) return result;
        for (String pair : raw.split("&")) {
            val eq = pair.indexOf('=');
            val key = URLDecoder.decode(eq < 0 ? pair : pair.substring(0, eq), StandardCharsets.UTF_8);
            val value = eq < 0 ? "" : URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            result.put(key, value);
        }
        return result;
    }

    @SneakyThrows
    private void json(HttpExchange exchange, int status, Object payload) {
        val json = mapperFactory.create(MapperFormat.JSON).writeValueAsString(payload);
        write(exchange, status, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
    }

    private void text(HttpExchange exchange, int status, String message) throws IOException {
        write(exchange, status, "text/plain; charset=utf-8", message.getBytes(StandardCharsets.UTF_8));
    }

    private void write(HttpExchange exchange, int status, String contentType, byte[] body) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(status, body.length == 0 ? -1 : body.length);
        if (body.length > 0) {
            try (val out = exchange.getResponseBody()) {
                out.write(body);
            }
        } else {
            exchange.close();
        }
    }

    /** A request this server refuses, with the status to answer. */
    private static final class Refusal extends RuntimeException {

        final int status;

        Refusal(int status, String message) {
            super(message);
            this.status = status;
        }
    }
}

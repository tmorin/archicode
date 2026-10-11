package io.morin.archicode.cli;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.manifest.ManifestConverter;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.Builder;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * The local, unauthenticated HTTP server backing the manifest editor (see {@code docker run ... editor serve}).
 * <p>
 * Exposes ten routes:
 * <ul>
 *   <li>{@code GET /} — the single-page manifest editor webapp, served byte-for-byte from the classpath resource
 *       {@code /editor-webapp/index.html} (run-0006 TDD {@code DEC-1}).</li>
 *   <li>{@code GET /api/graph} — the resolved graph, delegating to {@link GetGraphQuery#buildGraph}.</li>
 *   <li>{@code GET /api/schemas/{type}} — the JSON Schema for {@code type} = {@code workspace}|{@code manifest},
 *       delegating to {@link GetSchemasQuery#generateSchema}.</li>
 *   <li>{@code GET /api/manifests} — a flat listing of every manifest file discoverable under the workspace's
 *       configured {@code settings.manifests.paths}, each with its path, derived {@code reference}, and
 *       {@code kind} (or a {@code parseError} for a file that currently fails to parse) — run-0006 TDD
 *       {@code DEC-3}.</li>
 *   <li>{@code GET /api/manifests/{path}} — the raw byte content of the manifest file at {@code path}.</li>
 *   <li>{@code PUT /api/manifests/{path}} — validate then persist a manifest file's content.</li>
 *   <li>{@code GET /api/claude/status} — whether the Claude editing bridge can run here, and any change
 *       currently under review (run-0007 TDD {@code CTR-1}).</li>
 *   <li>{@code POST /api/claude/invoke} — apply one prose change request; the body is the prompt and nothing
 *       else (run-0007 TDD {@code CTR-2}).</li>
 *   <li>{@code POST /api/claude/accept/{sessionId}} — keep the pending change.</li>
 *   <li>{@code POST /api/claude/discard/{sessionId}} — undo it, byte-for-byte.</li>
 * </ul>
 * Implemented on the JDK's own {@code com.sun.net.httpserver.HttpServer} (no new Maven dependency; see
 * run-0005's TDD, {@code DEC-2}). Manifest read/write resolve {@code settings.manifests.paths} from the raw
 * workspace resource only (not the fully-indexed graph), so an unrelated dangling reference never blocks reading
 * or fixing a manifest (run-0006 TDD {@code DEC-3}); only {@code GET /api/graph} builds the full, indexed
 * workspace. That resolution now lives in {@link WorkspaceLayout} so the Claude bridge can share it
 * (run-0007 TDD {@code DEC-8}).
 */
@Slf4j
@ApplicationScoped
public class EditorHttpServer {

    private static final String MANIFESTS_PREFIX = "/api/manifests/";
    private static final String MANIFESTS_LISTING_PATH = "/api/manifests";
    private static final String SCHEMAS_PREFIX = "/api/schemas/";
    private static final String CLAUDE_PREFIX = "/api/claude/";
    private static final String WEBAPP_RESOURCE = "/editor-webapp/index.html";

    /**
     * Handler threads. Before run-0007 this server had no executor at all, so {@code HttpServer} ran every
     * handler on the single thread {@code start()} creates — harmless for four parse-and-respond handlers, and
     * unacceptable once one handler can occupy that thread for minutes: {@code status}, the tree, the graph and,
     * worst of all, {@code accept}/{@code discard} would be unserviceable for the duration of the very change
     * the operator was trying to undo. Four is ample for one operator and, unlike an unbounded pool, is not an
     * abusable resource on an unauthenticated port (run-0007 TDD {@code DEC-16}).
     */
    private static final int HANDLER_THREADS = 4;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    WorkspaceLayout workspaceLayout;

    @Inject
    ClaudeBridge claudeBridge;

    @Inject
    GetGraphQuery getGraphQuery;

    @Inject
    GetSchemasQuery getSchemasQuery;

    /**
     * Start the server with the default Claude bridge settings.
     * <p>
     * This three-argument signature is deliberately unchanged from run-0005 so every existing caller and test
     * keeps working untouched (run-0007 TDD {@code CON-2}).
     *
     * @param host              the address to bind to
     * @param port              the port to bind to (0 for an ephemeral port, used by tests)
     * @param workspaceFilePath the workspace file this server reads/writes against
     * @return the started, already-bound {@link HttpServer}
     */
    public HttpServer start(@NonNull String host, int port, @NonNull Path workspaceFilePath) {
        return start(host, port, workspaceFilePath, ClaudeBridge.Settings.defaults());
    }

    /**
     * Start the server.
     *
     * @param host              the address to bind to
     * @param port              the port to bind to (0 for an ephemeral port, used by tests)
     * @param workspaceFilePath the workspace file this server reads/writes against
     * @param claudeSettings    the Claude editing bridge's fixed settings for this server
     * @return the started, already-bound {@link HttpServer}
     */
    @SneakyThrows
    public HttpServer start(
        @NonNull String host,
        int port,
        @NonNull Path workspaceFilePath,
        @NonNull ClaudeBridge.Settings claudeSettings
    ) {
        val server = HttpServer.create(new InetSocketAddress(host, port), 0);
        server.setExecutor(Executors.newFixedThreadPool(HANDLER_THREADS));
        server.createContext("/", this::handleRoot);
        server.createContext("/api/graph", exchange -> handleGraph(exchange, workspaceFilePath));
        server.createContext(SCHEMAS_PREFIX, this::handleSchema);
        server.createContext(MANIFESTS_LISTING_PATH, exchange -> handleManifestsListing(exchange, workspaceFilePath));
        server.createContext(MANIFESTS_PREFIX, exchange -> handleManifest(exchange, workspaceFilePath));
        server.createContext(CLAUDE_PREFIX, exchange -> handleClaude(exchange, workspaceFilePath, claudeSettings));
        server.start();
        log.info("editor http server listening on {}:{}", host, server.getAddress().getPort());
        return server;
    }

    /**
     * Stop the given server, releasing its port immediately and shutting down its handler pool.
     *
     * @param server the server to stop
     */
    public void stop(@NonNull HttpServer server) {
        server.stop(0);
        if (server.getExecutor() instanceof ExecutorService executorService) {
            executorService.shutdownNow();
        }
    }

    @SneakyThrows
    private void handleRoot(HttpExchange exchange) {
        try (val stream = getClass().getResourceAsStream(WEBAPP_RESOURCE)) {
            if (stream == null) {
                log.warn("classpath resource {} is missing; serving a 500 instead of the webapp", WEBAPP_RESOURCE);
                writeResponse(
                    exchange,
                    500,
                    "text/plain; charset=utf-8",
                    ("editor webapp resource is missing from the classpath: " + WEBAPP_RESOURCE).getBytes(
                        StandardCharsets.UTF_8
                    )
                );
                return;
            }
            val bytes = stream.readAllBytes();
            writeResponse(exchange, 200, "text/html; charset=utf-8", bytes);
        }
    }

    /**
     * The Claude editing bridge's four routes (run-0007 TDD {@code DEC-1}), dispatched on the path suffix.
     * <p>
     * {@code POST invoke}'s request body is the prompt and nothing else: there is no structured field in which a
     * workspace, directory or path could be smuggled, which is what makes PRD {@code AC-13} structurally true
     * rather than merely unimplemented. Every refusal arrives as a {@link ClaudeBridge.BridgeRefusal} carrying
     * its own status, and a non-2xx from {@code invoke} means no invocation ran against the workspace, no
     * capture is held and no file was touched (TDD {@code CTR-2}).
     */
    @SneakyThrows
    private void handleClaude(HttpExchange exchange, Path workspaceFilePath, ClaudeBridge.Settings settings) {
        val suffix = exchange.getRequestURI().getPath().substring(CLAUDE_PREFIX.length());
        try {
            if ("status".equals(suffix)) {
                if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                    methodNotAllowed(exchange);
                    return;
                }
                writeJson(exchange, 200, claudeBridge.status(workspaceFilePath, settings));
                return;
            }

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                methodNotAllowed(exchange);
                return;
            }

            if ("invoke".equals(suffix)) {
                val prompt = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                writeJson(exchange, 200, claudeBridge.invoke(workspaceFilePath, settings, prompt));
            } else if (suffix.startsWith("accept/")) {
                writeJson(exchange, 200, claudeBridge.accept(sessionId(suffix, "accept/")));
            } else if (suffix.startsWith("discard/")) {
                writeJson(exchange, 200, claudeBridge.discard(sessionId(suffix, "discard/")));
            } else {
                writeResponse(
                    exchange,
                    404,
                    "text/plain; charset=utf-8",
                    ("unknown claude bridge route: " + suffix).getBytes(StandardCharsets.UTF_8)
                );
            }
        } catch (ClaudeBridge.BridgeRefusal e) {
            log.info("claude bridge refused a request ({}): {}", e.getStatus(), e.getMessage());
            writeResponse(
                exchange,
                e.getStatus(),
                "text/plain; charset=utf-8",
                errorMessage(e).getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("the claude bridge failed unexpectedly", e);
            writeResponse(exchange, 500, "text/plain; charset=utf-8", errorMessage(e).getBytes(StandardCharsets.UTF_8));
        }
    }

    private String sessionId(String suffix, String prefix) {
        return URLDecoder.decode(suffix.substring(prefix.length()), StandardCharsets.UTF_8);
    }

    @SneakyThrows
    private void writeJson(HttpExchange exchange, int status, Object payload) {
        val json = mapperFactory.create(MapperFormat.JSON).writeValueAsString(payload);
        writeResponse(exchange, status, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
    }

    @SneakyThrows
    private void handleManifestsListing(HttpExchange exchange, Path workspaceFilePath) {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            methodNotAllowed(exchange);
            return;
        }

        val workspaceDir = workspaceLayout.workspaceDir(workspaceFilePath);
        val entries = new ArrayList<ManifestEntry>();

        for (Path manifestsDir : workspaceLayout.manifestsDirs(workspaceFilePath)) {
            // Unlike ManifestParser.parse, WorkspaceLayout.manifestsDirs does not filter out configured paths that don't
            // exist on disk (e.g. a fresh workspace before its first manifest is authored); skip those here,
            // the same Files.isDirectory guard isWithinConfiguredManifestsDir already applies.
            if (!Files.isDirectory(manifestsDir)) {
                continue;
            }
            val directory = manifestsDir.toFile();
            val files = Optional.ofNullable(
                directory.listFiles((dir, name) -> MapperFormat.resolve(name).isPresent())
            ).orElse(new File[0]);
            for (File file : files) {
                entries.add(toManifestEntry(workspaceDir, file.toPath()));
            }
        }

        val listing = ManifestsListing.builder().manifests(entries).build();
        val json = mapperFactory.create(MapperFormat.JSON).writeValueAsString(listing);
        writeResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Derive one listing entry for the given manifest file: {@code reference}/{@code kind} on success (same
     * derivation {@link io.morin.archicode.manifest.ManifestParser.Candidate} uses), or a {@code parseError}
     * instead so one unparseable file never fails the whole listing (TDD {@code DEC-3}).
     */
    private ManifestEntry toManifestEntry(Path workspaceDir, Path file) {
        val relativePath = workspaceDir.relativize(file).toString();
        try {
            val manifest = mapperFactory.create(file).readValue(file.toFile(), Manifest.class);
            val id = manifest.getContent().get("id").asText();
            val parent = manifest.getHeader().getParent();
            val reference = parent != null ? parent + "." + id : id;
            val kind = manifest.getHeader().getKind().getId();
            return ManifestEntry.builder().path(relativePath).reference(reference).kind(kind).parseError(null).build();
        } catch (Exception e) {
            log.info("unable to parse the manifest {} while listing: {}", file, e.toString());
            return ManifestEntry.builder()
                .path(relativePath)
                .reference(null)
                .kind(null)
                .parseError(errorMessage(e))
                .build();
        }
    }

    @SneakyThrows
    private void handleGraph(HttpExchange exchange, Path workspaceFilePath) {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            methodNotAllowed(exchange);
            return;
        }
        try {
            val workspace = workspaceFactory.create(workspaceFilePath.toAbsolutePath());
            val graph = getGraphQuery.buildGraph(workspace);
            val json = mapperFactory.create(MapperFormat.JSON).writeValueAsString(graph);
            writeResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("failed to build the graph for {}", workspaceFilePath, e);
            writeResponse(exchange, 500, "text/plain; charset=utf-8", errorMessage(e).getBytes(StandardCharsets.UTF_8));
        }
    }

    @SneakyThrows
    private void handleSchema(HttpExchange exchange) {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            methodNotAllowed(exchange);
            return;
        }
        val requestPath = exchange.getRequestURI().getPath();
        val typeSegment = requestPath.substring(SCHEMAS_PREFIX.length());
        try {
            val type = GetSchemasQuery.SchemaType.valueOf(typeSegment.toUpperCase());
            val schema = getSchemasQuery.generateSchema(type);
            val json = mapperFactory
                .create(MapperFormat.JSON)
                .writerWithDefaultPrettyPrinter()
                .writeValueAsString(schema);
            writeResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            writeResponse(
                exchange,
                400,
                "text/plain; charset=utf-8",
                ("unknown schema type: " + typeSegment).getBytes(StandardCharsets.UTF_8)
            );
        }
    }

    @SneakyThrows
    private void handleManifest(HttpExchange exchange, Path workspaceFilePath) {
        val requestPath = exchange.getRequestURI().getPath();
        val relativePath = requestPath.substring(MANIFESTS_PREFIX.length());

        if (relativePath.isBlank()) {
            writeResponse(
                exchange,
                400,
                "text/plain; charset=utf-8",
                "missing manifest path".getBytes(StandardCharsets.UTF_8)
            );
            return;
        }

        val workspaceDir = workspaceLayout.workspaceDir(workspaceFilePath);
        val target = workspaceDir.resolve(relativePath).normalize();

        if (!isWithinConfiguredManifestsDir(workspaceFilePath, target) || MapperFormat.resolve(target).isEmpty()) {
            writeResponse(
                exchange,
                400,
                "text/plain; charset=utf-8",
                "path is not a configured manifest file".getBytes(StandardCharsets.UTF_8)
            );
            return;
        }

        val method = exchange.getRequestMethod();
        if ("GET".equalsIgnoreCase(method)) {
            handleManifestGet(exchange, target);
        } else if ("PUT".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method)) {
            handleManifestWrite(exchange, target);
        } else {
            methodNotAllowed(exchange);
        }
    }

    @SneakyThrows
    private void handleManifestGet(HttpExchange exchange, Path target) {
        if (!Files.isRegularFile(target)) {
            writeResponse(
                exchange,
                404,
                "text/plain; charset=utf-8",
                "manifest not found".getBytes(StandardCharsets.UTF_8)
            );
            return;
        }
        val bytes = Files.readAllBytes(target);
        writeResponse(exchange, 200, contentTypeFor(target), bytes);
    }

    @SneakyThrows
    private void handleManifestWrite(HttpExchange exchange, Path target) {
        val bytes = exchange.getRequestBody().readAllBytes();

        try {
            val mapper = mapperFactory.create(target);
            val manifest = mapper.readValue(bytes, Manifest.class);
            ManifestConverter.builder().manifest(manifest).mapper(mapper).build().convert();
        } catch (Exception e) {
            log.info("rejected an invalid manifest write for {}: {}", target, e.toString());
            writeResponse(exchange, 400, "text/plain; charset=utf-8", errorMessage(e).getBytes(StandardCharsets.UTF_8));
            return;
        }

        val existedBefore = Files.exists(target);
        Files.write(target, bytes);
        writeResponse(
            exchange,
            existedBefore ? 200 : 201,
            "text/plain; charset=utf-8",
            "ok".getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Check that {@code target}'s parent directory is exactly one of the workspace's configured
     * {@code settings.manifests.paths} — not merely nested under one — mirroring {@code ManifestParser}'s own
     * non-recursive directory listing and closing path traversal (a {@code target} containing {@code ..} will
     * normalize to some other real location, which will not equal any configured manifests dir's real path).
     * <p>
     * The directory resolution itself lives in {@link WorkspaceLayout} (run-0007 TDD {@code DEC-8}); the
     * {@code toRealPath} equality below is unchanged from run-0005.
     */
    @SneakyThrows
    private boolean isWithinConfiguredManifestsDir(Path workspaceFilePath, Path target) {
        val targetParent = target.getParent();
        if (targetParent == null || !Files.isDirectory(targetParent)) {
            return false;
        }
        val targetRealParent = targetParent.toRealPath();

        for (Path manifestsDir : workspaceLayout.manifestsDirs(workspaceFilePath)) {
            if (Files.isDirectory(manifestsDir) && manifestsDir.toRealPath().equals(targetRealParent)) {
                return true;
            }
        }
        return false;
    }

    private String contentTypeFor(Path target) {
        return MapperFormat.resolve(target)
            .map(
                format ->
                    switch (format) {
                        case YAML -> "application/yaml; charset=utf-8";
                        case TOML -> "application/toml; charset=utf-8";
                        case JSON -> "application/json; charset=utf-8";
                    }
            )
            .orElse("application/octet-stream");
    }

    private String errorMessage(Exception e) {
        return Optional.ofNullable(e.getMessage()).orElse(e.toString());
    }

    @SneakyThrows
    private void methodNotAllowed(HttpExchange exchange) {
        writeResponse(
            exchange,
            405,
            "text/plain; charset=utf-8",
            "method not allowed".getBytes(StandardCharsets.UTF_8)
        );
    }

    @SneakyThrows
    private void writeResponse(HttpExchange exchange, int status, String contentType, byte[] body) {
        try {
            exchange.getResponseHeaders().add("Content-Type", contentType);
            exchange.sendResponseHeaders(status, body.length);
            try (val os = exchange.getResponseBody()) {
                os.write(body);
            }
        } catch (IOException e) {
            log.warn("failed to write the HTTP response", e);
        } finally {
            exchange.close();
        }
    }

    /**
     * {@code GET /api/manifests}'s response body (TDD {@code CTR-1}).
     */
    @Value
    @Builder
    public static class ManifestsListing {

        List<ManifestEntry> manifests;
    }

    /**
     * One {@code GET /api/manifests} entry: {@code path} is always present; {@code reference}/{@code kind} are
     * present when the file parses as a {@link Manifest}, otherwise they are {@code null} and {@code parseError}
     * carries the failure's message (TDD {@code DEC-3}/{@code CTR-1}).
     */
    @Value
    @Builder
    public static class ManifestEntry {

        String path;

        // Explicitly always-included (overriding MapperFactory's global NON_EMPTY inclusion) so a successfully
        // parsed entry's absent parseError, or a failed entry's absent reference/kind, is always a literal JSON
        // null rather than an omitted key — matching this run's TDD CTR-1 response shape exactly.
        @JsonInclude(JsonInclude.Include.ALWAYS)
        String reference;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String kind;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        String parseError;
    }
}

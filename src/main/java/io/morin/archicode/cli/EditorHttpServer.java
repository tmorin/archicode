package io.morin.archicode.cli;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.manifest.ManifestConverter;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * The local, unauthenticated HTTP server backing the manifest editor (see {@code docker run ... editor serve}).
 * <p>
 * Exposes four routes:
 * <ul>
 *   <li>{@code GET /api/graph} — the resolved graph, delegating to {@link GetGraphQuery#buildGraph}.</li>
 *   <li>{@code GET /api/schemas/{type}} — the JSON Schema for {@code type} = {@code workspace}|{@code manifest},
 *       delegating to {@link GetSchemasQuery#generateSchema}.</li>
 *   <li>{@code GET /api/manifests/{path}} — the raw byte content of the manifest file at {@code path}.</li>
 *   <li>{@code PUT /api/manifests/{path}} — validate then persist a manifest file's content.</li>
 * </ul>
 * Implemented on the JDK's own {@code com.sun.net.httpserver.HttpServer} (no new Maven dependency; see this
 * run's TDD, {@code DEC-2}). Manifest read/write resolve {@code settings.manifests.paths} from the raw workspace
 * resource only (not the fully-indexed graph), so an unrelated dangling reference never blocks reading or fixing
 * a manifest (TDD {@code DEC-3}); only {@code GET /api/graph} builds the full, indexed workspace.
 */
@Slf4j
@ApplicationScoped
public class EditorHttpServer {

    private static final String MANIFESTS_PREFIX = "/api/manifests/";
    private static final String SCHEMAS_PREFIX = "/api/schemas/";

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @Inject
    GetGraphQuery getGraphQuery;

    @Inject
    GetSchemasQuery getSchemasQuery;

    /**
     * Start the server.
     *
     * @param host              the address to bind to
     * @param port              the port to bind to (0 for an ephemeral port, used by tests)
     * @param workspaceFilePath the workspace file this server reads/writes against
     * @return the started, already-bound {@link HttpServer}
     */
    @SneakyThrows
    public HttpServer start(@NonNull String host, int port, @NonNull Path workspaceFilePath) {
        val server = HttpServer.create(new InetSocketAddress(host, port), 0);
        server.createContext("/", this::handleRoot);
        server.createContext("/api/graph", exchange -> handleGraph(exchange, workspaceFilePath));
        server.createContext(SCHEMAS_PREFIX, this::handleSchema);
        server.createContext(MANIFESTS_PREFIX, exchange -> handleManifest(exchange, workspaceFilePath));
        server.start();
        log.info("editor http server listening on {}:{}", host, server.getAddress().getPort());
        return server;
    }

    /**
     * Stop the given server, releasing its port immediately.
     *
     * @param server the server to stop
     */
    public void stop(@NonNull HttpServer server) {
        server.stop(0);
    }

    @SneakyThrows
    private void handleRoot(HttpExchange exchange) {
        writeResponse(
            exchange,
            200,
            "text/plain; charset=utf-8",
            "ArchiCode Manifest Editor API — no webapp yet, see wave 002 W-3.".getBytes(StandardCharsets.UTF_8)
        );
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

        val workspaceDir = workspaceFilePath.toAbsolutePath().normalize().getParent();
        val target = workspaceDir.resolve(relativePath).normalize();

        if (
            !isWithinConfiguredManifestsDir(workspaceFilePath, workspaceDir, target) ||
            MapperFormat.resolve(target).isEmpty()
        ) {
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
     */
    @SneakyThrows
    private boolean isWithinConfiguredManifestsDir(Path workspaceFilePath, Path workspaceDir, Path target) {
        val targetParent = target.getParent();
        if (targetParent == null || !Files.isDirectory(targetParent)) {
            return false;
        }
        val targetRealParent = targetParent.toRealPath();

        for (Path manifestsDir : resolveManifestsDirs(workspaceFilePath, workspaceDir)) {
            if (Files.isDirectory(manifestsDir) && manifestsDir.toRealPath().equals(targetRealParent)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Resolve {@code settings.manifests.paths} by parsing only the raw workspace resource — the same first step
     * {@link WorkspaceFactory#create(Path)} performs before manifest parsing or index building (TDD {@code DEC-3}).
     */
    @SneakyThrows
    private List<Path> resolveManifestsDirs(Path workspaceFilePath, Path workspaceDir) {
        val rawMapper = mapperFactory.create(workspaceFilePath);
        val rawWorkspace = rawMapper.readValue(
            workspaceFilePath.toFile(),
            io.morin.archicode.resource.workspace.Workspace.class
        );
        return rawWorkspace.getSettings().getManifests().getPaths().stream().map(workspaceDir::resolve).toList();
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
}

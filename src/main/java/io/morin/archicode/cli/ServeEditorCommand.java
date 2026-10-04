package io.morin.archicode.cli;

import jakarta.inject.Inject;
import java.util.concurrent.CountDownLatch;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * Start the local, unauthenticated HTTP server backing the manifest editor.
 * <p>
 * Binds to {@link #host} (default {@code 0.0.0.0}, required for a Docker {@code -p} mapping to forward traffic
 * at all) on {@link #port} (default {@code 8080}) and blocks until the process is terminated. See
 * {@link EditorHttpServer} for the actual routes served.
 */
@Slf4j
@CommandLine.Command(name = "serve", description = "Start the local manifest editor HTTP server.")
@SuppressWarnings("java:S6813")
public class ServeEditorCommand implements Runnable {

    @CommandLine.ParentCommand
    EditorGroup editorGroup;

    @Inject
    EditorHttpServer editorHttpServer;

    @CommandLine.Option(
        names = { "-p", "--port" },
        description = "The TCP port to listen on.",
        defaultValue = "8080",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<port>"
    )
    int port;

    @CommandLine.Option(
        names = { "--host" },
        description = {
            "The address to bind to.",
            "Must stay 0.0.0.0 (the default) for a Docker -p mapping to forward traffic at all.",
            "This server has no authentication: control exposure via the host-side port mapping" +
                " (e.g. `-p 127.0.0.1:8080:8080`), not by changing this option, unless running directly" +
                " outside a container."
        },
        defaultValue = "0.0.0.0",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<host>"
    )
    String host;

    @SneakyThrows
    @Override
    public void run() {
        val workspaceFilePath = editorGroup.archiCode.workspaceFilePath.toAbsolutePath();
        val server = editorHttpServer.start(host, port, workspaceFilePath);

        log.info(
            "editor serve listening on {}:{} (workspace: {})",
            host,
            server.getAddress().getPort(),
            workspaceFilePath
        );

        val shutdownLatch = new CountDownLatch(1);
        Runtime.getRuntime().addShutdownHook(
            new Thread(() -> {
                log.info("stopping the editor server");
                editorHttpServer.stop(server);
                shutdownLatch.countDown();
            })
        );
        // Block forever: the server runs until the process receives a termination signal
        // (Ctrl+C, `docker stop`), handled by the shutdown hook above.
        shutdownLatch.await();
    }
}

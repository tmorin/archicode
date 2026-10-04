package io.morin.archicode.cli;

import jakarta.inject.Inject;
import java.time.Duration;
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
 * <p>
 * The {@code --claude*} options configure the Claude editing bridge (run-0007). Every one of them is fixed here,
 * at startup, and none can be influenced by a client: the bridge's HTTP surface accepts a prompt and nothing
 * else, so no request can widen the blast radius of an invocation.
 */
@Slf4j
@CommandLine.Command(name = "serve", description = "Start the local manifest editor HTTP server.")
@SuppressWarnings("java:S6813")
public class ServeEditorCommand implements Runnable {

    @CommandLine.ParentCommand
    EditorGroup editorGroup;

    @Inject
    EditorHttpServer editorHttpServer;

    @Inject
    ClaudeBridge claudeBridge;

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

    @CommandLine.Option(
        names = { "--claude" },
        negatable = true,
        description = {
            "Enable the Claude editing bridge, which lets the webapp apply a described change to the" +
                " workspace's files and review it as a diff.",
            "Use --no-claude to serve the editor without it."
        },
        defaultValue = "true",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS
    )
    boolean claudeEnabled;

    @CommandLine.Option(
        names = { "--claude-executable" },
        description = {
            "The Claude Code CLI to invoke.",
            "Must be present on the host running this server; the published container image does not include it."
        },
        defaultValue = "claude",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<executable>"
    )
    String claudeExecutable;

    @CommandLine.Option(
        names = { "--claude-model" },
        description = "The model the Claude editing bridge invokes.",
        defaultValue = "sonnet",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<model>"
    )
    String claudeModel;

    @CommandLine.Option(
        names = { "--claude-timeout" },
        description = {
            "How long, in seconds, one invocation may run before it is terminated.",
            "A terminated invocation's partial change is still shown as a diff and can still be discarded."
        },
        defaultValue = "300",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<seconds>"
    )
    int claudeTimeoutSeconds;

    @SneakyThrows
    @Override
    public void run() {
        val workspaceFilePath = editorGroup.archiCode.workspaceFilePath.toAbsolutePath();
        val claudeSettings = ClaudeBridge.Settings.builder()
            .enabled(claudeEnabled)
            .executable(claudeExecutable)
            .model(claudeModel)
            .timeout(Duration.ofSeconds(claudeTimeoutSeconds))
            .build();
        val server = editorHttpServer.start(host, port, workspaceFilePath, claudeSettings);

        log.info(
            "editor serve listening on {}:{} (workspace: {}, claude bridge: {})",
            host,
            server.getAddress().getPort(),
            workspaceFilePath,
            claudeEnabled ? "enabled" : "disabled"
        );

        val shutdownLatch = new CountDownLatch(1);
        Runtime.getRuntime().addShutdownHook(
            new Thread(() -> {
                log.info("stopping the editor server");
                warnAboutPendingChange();
                editorHttpServer.stop(server);
                shutdownLatch.countDown();
            })
        );
        // Block forever: the server runs until the process receives a termination signal
        // (Ctrl+C, `docker stop`), handled by the shutdown hook above.
        shutdownLatch.await();
    }

    /**
     * Tell the operator, by path, that a change left under review stays on disk.
     * <p>
     * There is deliberately no auto-discard here (run-0007 TDD {@code DEC-6}): a {@code docker stop} arriving a
     * second after the operator decided to keep a change would silently destroy work they had already judged
     * good, and that is not recoverable — whereas files left in their changed state are. This list is the only
     * thing an operator can hand-revert from, since the capture dies with the process.
     * <p>
     * It is written to {@code System.err} and <em>not</em> only through the logger, on purpose. This
     * application sets {@code quarkus.log.level=ERROR} in {@code application.properties}, so a
     * {@code log.warn} here is discarded before it reaches any handler — which is how the first version of
     * this method shipped a recovery list that was documented in {@code README.md} and invisible in practice.
     * An operator-facing safety notice must not depend on log configuration. The logger call is kept alongside
     * it so a deployment that does raise the level gets the message structured as well.
     */
    private void warnAboutPendingChange() {
        claudeBridge.pendingChange().ifPresent(pending -> {
            val header = String.format(
                "WARNING: the change %s was still awaiting review and is NOT being reverted. %d file(s)" +
                    " remain in their changed state:",
                pending.getSessionId(),
                pending.getChanges().size()
            );
            System.err.println(header);
            log.warn(header);
            pending.getChanges().forEach(change -> {
                val line = String.format("  still changed: %s (%s)", change.getPath(), change.getChangeType());
                System.err.println(line);
                log.warn(line);
            });
            System.err.println(
                "  Restart `editor serve` and re-review, or restore these files yourself; the snapshot" +
                    " this change could have been discarded from does not survive this process."
            );
            System.err.flush();
        });
    }
}

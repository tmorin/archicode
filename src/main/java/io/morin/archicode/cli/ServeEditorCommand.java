package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

/**
 * Serve the standalone editor, with the folder of the workspace already opened in it.
 * <p>
 * Binds to {@link #host} (default {@code 0.0.0.0}, required for a Docker {@code -p} mapping to forward traffic at
 * all) on {@link #port} (default {@code 48080}) and blocks until the process is terminated. See
 * {@link EditorHttpServer} for the routes and for how a request is checked.
 */
@Slf4j
@CommandLine.Command(name = "serve", description = "Serve the editor, with the workspace folder opened in it.")
public class ServeEditorCommand implements Runnable {

    @CommandLine.ParentCommand
    EditorGroup editorGroup;

    @CommandLine.Spec
    CommandLine.Model.CommandSpec spec;

    @Inject
    EditorHttpServer editorHttpServer;

    @CommandLine.Option(
        names = { "-p", "--port" },
        description = "The TCP port to listen on.",
        defaultValue = "48080",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<port>"
    )
    int port;

    @CommandLine.Option(
        names = { "--host" },
        description = {
            "The address to bind to.",
            "Must stay 0.0.0.0 (the default) for a Docker -p mapping to forward traffic at all.",
            "Requests are only accepted when addressed to localhost, 127.0.0.1 or [::1] (see --allowed-host)" +
                " and when they carry the token of this server (printed in the URL to open): control exposure with the host-side port mapping" +
                " (e.g. `-p 127.0.0.1:48080:48080`)."
        },
        defaultValue = "0.0.0.0",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        paramLabel = "<host>"
    )
    String host;

    @CommandLine.Option(
        names = { "--allowed-host" },
        description = {
            "A host name, besides localhost, 127.0.0.1 and [::1], that a request may be addressed to.",
            "Repeat it for several. Only for a server reached by name from another machine."
        },
        paramLabel = "<name>"
    )
    List<String> allowedHosts = List.of();

    @SneakyThrows
    @Override
    public void run() {
        val workspaceFilePath = editorGroup.archiCode.workspaceFilePath.toAbsolutePath();
        if (!".archicode.yaml".equals(String.valueOf(workspaceFilePath.getFileName()))) {
            throw new CommandLine.ParameterException(
                spec.commandLine(),
                "the editor opens a folder with a .archicode.yaml: " + workspaceFilePath + " is not named so."
            );
        }
        if (WorkspaceFactory.holdsFormerNameOnly(workspaceFilePath)) {
            throw new ArchiCodeException("%s", WorkspaceFactory.FORMER_NAME_SENTENCE);
        }
        val running = editorHttpServer.start(host, port, workspaceFilePath, new HashSet<>(allowedHosts));

        // Printed to System.out, not only through the logger: application.properties sets quarkus.log.level=ERROR,
        // so a log.info call never reaches a handler and the operator would get no sign that the server is up.
        // The URL carries the token: the page is refused without it.
        val readyMessage = String.format(
            "editor serve is up and running: http://127.0.0.1:%d/?token=%s (workspace: %s)",
            running.server().getAddress().getPort(),
            running.token(),
            workspaceFilePath
        );
        System.out.println(readyMessage);
        log.info(readyMessage);

        val shutdownLatch = new CountDownLatch(1);
        Runtime.getRuntime().addShutdownHook(
            new Thread(() -> {
                log.info("stopping the editor server");
                editorHttpServer.stop(running);
                shutdownLatch.countDown();
            })
        );
        // Block until the process receives a termination signal (Ctrl+C, `docker stop`).
        shutdownLatch.await();
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sun.net.httpserver.HttpServer;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode editor serve}, in this process: what it asks of the server and what it prints once the server is up. The
 * server is a double (the real one is {@link EditorHttpServerTest}'s, and the process that serves a page is
 * {@code EditorServeIT}); the command blocks until it is stopped, so it runs in a thread that the test interrupts.
 */
@QuarkusTest
class ServeEditorCommandTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @InjectMock
    EditorHttpServer server;

    @TempDir
    Path dir;

    @Test
    @SneakyThrows
    void shouldStartTheServerOnTheFolderOfTheWorkspaceAndSayWhereToGo() {
        val workspace = Files.writeString(dir.resolve(".archicode.yaml"), "settings: {}\n");
        val http = mock(HttpServer.class);
        when(http.getAddress()).thenReturn(new InetSocketAddress("127.0.0.1", 4242));
        when(server.start(any(), anyInt(), any(), any())).thenReturn(new EditorHttpServer.Running(http, "the-token"));

        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val exit = new AtomicInteger(-1);
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        val thread = new Thread(() -> {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
            errorOutput.install(commandLine);
            exit.set(
                commandLine.execute(
                    "-w",
                    workspace.toString(),
                    "editor",
                    "serve",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "0",
                    "--allowed-host",
                    "editor.example"
                )
            );
        });
        try {
            thread.start();
            val deadline = System.nanoTime() + 30_000_000_000L;
            while (
                !out.toString(StandardCharsets.UTF_8).contains("editor serve is up") && System.nanoTime() < deadline
            ) {
                Thread.sleep(20);
            }
            assertEquals(
                "editor serve is up and running: http://127.0.0.1:4242/?token=the-token (workspace: " +
                    workspace.toAbsolutePath() +
                    ")\n",
                out.toString(StandardCharsets.UTF_8)
            );
            assertTrue(thread.isAlive(), "the command blocks until it is stopped");
            verify(server).start(eq("127.0.0.1"), eq(0), eq(workspace.toRealPath()), eq(Set.of("editor.example")));
        } finally {
            thread.interrupt();
            thread.join(30_000);
            System.setOut(previousOut);
        }
        assertFalse(thread.isAlive(), "interrupted, the command ends");
        assertEquals(1, exit.get(), err.toString(StandardCharsets.UTF_8));
    }
}

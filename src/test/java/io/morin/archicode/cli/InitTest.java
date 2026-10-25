package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeFalse;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/** {@code archicode init} (wave 022, run 0160, T5): what it writes loads and is drawn, it overwrites nothing, {@code .gitignore} only grows. */
@QuarkusTest
class InitTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private CliHarness.Result run(String... args) {
        return CliHarness.run(factory, errorOutput, args);
    }

    @SneakyThrows
    private String snapshot(Path root) {
        try (Stream<Path> files = Files.walk(root)) {
            val sb = new StringBuilder();
            for (val f : files.filter(Files::isRegularFile).sorted().toList()) {
                sb.append(root.relativize(f)).append('=').append(Files.readString(f)).append('\n');
            }
            return sb.toString();
        }
    }

    @Test
    @SneakyThrows
    void itWritesAWorkspaceInAFolderItCreatesAndTheCommandLineLoadsAndDrawsIt() {
        val target = dir.resolve("new/place");
        val init = run("init", target.toString());
        assertEquals(0, init.exit(), init.err());
        assertEquals("", init.err());
        assertTrue(Files.isRegularFile(target.resolve(".archicode.yaml")));
        assertTrue(
            init.out().contains("archicode views generate") && init.out().contains("archicode query graph"),
            init.out()
        );
        assertEquals("/views*/\n", Files.readString(target.resolve(".gitignore")).replace("\r", ""));
        val workspace = target.resolve(".archicode.yaml").toString();
        val graph = run("query", "graph", "-w", workspace);
        assertEquals(0, graph.exit(), graph.err());
        assertTrue(graph.out().contains("shop.web"), graph.out());
        val views = run("views", "generate", "-w", workspace);
        assertEquals(0, views.exit(), views.err());
        val saved = run("views", "generate", "-i", "shop_overview", "-w", workspace);
        assertEquals(0, saved.exit(), saved.err());
        assertEquals("", saved.err());
        assertTrue(Files.isRegularFile(target.resolve("views/plantuml/application/shop_overview.puml")));
    }

    @Test
    void itDefaultsToTheCurrentFolderAndRefusesAWorkspaceThatIsThereWritingNothing() {
        val target = dir.resolve("again");
        assertEquals(0, run("init", target.toString()).exit());
        val before = snapshot(target);
        val second = run("init", target.toString());
        assertEquals(1, second.exit());
        assertTrue(second.err().startsWith("error: "), second.err());
        assertEquals(1, second.err().strip().lines().count(), second.err());
        assertEquals("", second.out());
        assertEquals(before, snapshot(target));
    }

    @Test
    @SneakyThrows
    void aManifestThatIsAlreadyThereRefusesBeforeAnythingIsWritten() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/shop.yaml"), "mine\n");
        val result = run("init", dir.toString());
        assertEquals(1, result.exit());
        assertTrue(result.err().startsWith("error: "), result.err());
        assertFalse(Files.exists(dir.resolve(".archicode.yaml")));
        assertFalse(Files.exists(dir.resolve(".gitignore")));
        assertEquals("mine\n", Files.readString(dir.resolve("manifests/shop.yaml")));
    }

    @Test
    @SneakyThrows
    void aFileIsNoFolder() {
        val file = dir.resolve("a-file");
        Files.writeString(file, "x");
        val result = run("init", file.toString());
        assertEquals(1, result.exit());
        assertTrue(result.err().startsWith("error: "), result.err());
        assertEquals("x", Files.readString(file));
    }

    @Test
    @SneakyThrows
    void anExistingGitignoreGetsTheLineOnceAndLosesNothing() {
        val withoutNewline = dir.resolve("a");
        Files.createDirectories(withoutNewline);
        Files.writeString(withoutNewline.resolve(".gitignore"), "target/\n*.log");
        assertEquals(0, run("init", withoutNewline.toString()).exit());
        assertEquals("target/\n*.log\n/views*/\n", Files.readString(withoutNewline.resolve(".gitignore")));

        val alreadyThere = dir.resolve("b");
        Files.createDirectories(alreadyThere);
        Files.writeString(alreadyThere.resolve(".gitignore"), "/views*/\nbuild/\n");
        assertEquals(0, run("init", alreadyThere.toString()).exit());
        assertEquals("/views*/\nbuild/\n", Files.readString(alreadyThere.resolve(".gitignore")));

        val empty = dir.resolve("c");
        Files.createDirectories(empty);
        Files.writeString(empty.resolve(".gitignore"), "");
        assertEquals(0, run("init", empty.toString()).exit());
        assertEquals("/views*/\n", Files.readString(empty.resolve(".gitignore")));
    }

    @Test
    void theHintQuotesAFolderThatTheShellWouldSplit() {
        assertEquals("my-architecture", InitCommand.shellQuoted("my-architecture"));
        assertEquals("'my architecture'", InitCommand.shellQuoted("my architecture"));
        assertEquals("'it'\\''s'", InitCommand.shellQuoted("it's"));
        val target = dir.resolve("my architecture");
        val init = run("init", target.toString());
        assertEquals(0, init.exit(), init.err());
        assertTrue(init.out().contains("cd '" + target + "' && archicode query graph"), init.out());
    }

    @Test
    @SneakyThrows
    void aDanglingLinkWhereAFileGoesRefusesAndLeavesNothingHalfWritten() {
        Files.createDirectories(dir.resolve("manifests"));
        Files.createSymbolicLink(dir.resolve("manifests/shop.yaml"), dir.resolve("nowhere.yaml"));
        val before = snapshot(dir);
        val init = run("init", dir.toString());
        assertEquals(1, init.exit(), init.err());
        assertTrue(init.err().startsWith("error: "), init.err());
        assertTrue(init.err().lines().count() <= 2, init.err());
        assertEquals(before, snapshot(dir));
        assertTrue(Files.notExists(dir.resolve(".archicode.yaml")));
    }

    @Test
    @SneakyThrows
    void aFolderTheFileSystemRefusesInTheMiddleLeavesNothingHalfWritten() {
        val manifests = Files.createDirectories(dir.resolve("manifests"));
        assertTrue(manifests.toFile().setWritable(false, false));
        try {
            assumeFalse(Files.isWritable(manifests), "the user can write whatever the mode (root)");
            val before = snapshot(dir);
            val init = run("init", dir.toString());
            assertEquals(1, init.exit(), init.err());
            assertTrue(init.err().startsWith("error: "), init.err());
            assertTrue(init.err().lines().count() <= 2, init.err());
            assertEquals(before, snapshot(dir));
            assertTrue(Files.notExists(dir.resolve(".archicode.yaml")));
            // a second init is not told that the folder already holds a workspace
            val again = run("init", dir.toString());
            assertFalse(again.err().contains("already holds"), again.err());
        } finally {
            manifests.toFile().setWritable(true, false);
        }
    }
}

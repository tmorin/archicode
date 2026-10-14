package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The plateaus from the command line: {@code --plateau} on the commands that load a workspace, and {@code plateau add}.
 */
@QuarkusTest
class PlateauCliTest {

    @Inject
    CommandLine.IFactory factory;

    @TempDir
    Path dir;

    private static String system(String id, String name) {
        return """
        header:
          kind: "archicode.morin.io/system"
          version: "1"
        content:
          id: "%s"
          name: "%s"
        """.formatted(id, name);
    }

    @SneakyThrows
    private Path workspace() {
        Files.createDirectories(dir.resolve("plateaus/10_as-is"));
        Files.createDirectories(dir.resolve("plateaus/20_to-be"));
        Files.writeString(dir.resolve("plateaus/10_as-is/shop.yaml"), system("shop", "Shop"));
        Files.writeString(dir.resolve("plateaus/20_to-be/shop.yaml"), system("shop", "Shop"));
        Files.writeString(dir.resolve("plateaus/20_to-be/crm.yaml"), system("crm", "CRM"));
        Files.writeString(
            dir.resolve("workspace.yaml"),
            "# two states\nsettings:\n  plateaus:\n    - id: as-is\n      path: plateaus/10_as-is\n    - id: to-be\n      path: plateaus/20_to-be\n"
        );
        return dir.resolve("workspace.yaml");
    }

    private record Result(int exit, String out, String err) {}

    private Result run(String... args) {
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new java.io.PrintWriter(err, true, StandardCharsets.UTF_8));
            commandLine.setExecutionExceptionHandler((e, c, p) -> {
                c.getErr().println(e.getMessage());
                return 1;
            });
            val exit = commandLine.execute(args);
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    @Test
    void thePlateauAskedForIsTheOneThatIsGenerated() {
        val workspace = workspace();
        // `--plateau` is accepted by the commands that load a workspace; without it the last plateau is read
        val as = run("-w", workspace.toString(), "views", "generate", "--plateau", "as-is", "-o", "out-as-is");
        assertEquals(0, as.exit, as.err);
        val last = run("-w", workspace.toString(), "views", "generate", "-o", "out-last");
        assertEquals(0, last.exit, last.err);
        assertFalse(Files.exists(dir.resolve("out-as-is/plantuml/application/crm-overview.puml")));
        assertTrue(Files.exists(dir.resolve("out-last/plantuml/application/crm-overview.puml")));
        assertTrue(Files.exists(dir.resolve("out-as-is/plantuml/application/shop-overview.puml")));
    }

    @Test
    void theQueriesTakeThePlateauToo() {
        val workspace = workspace();
        val as = run("-w", workspace.toString(), "query", "graph", "--plateau", "as-is");
        assertEquals(0, as.exit, as.err);
        assertFalse(as.out.contains("crm"), as.out);
        val last = run("-w", workspace.toString(), "query", "graph");
        assertTrue(last.out.contains("crm"), last.out);
        val views = run("-w", workspace.toString(), "query", "views", "--plateau", "as-is", "-f", "json");
        assertEquals(0, views.exit, views.err);
        assertFalse(views.out.contains("crm"), views.out);
    }

    @Test
    void anUnknownPlateauFailsWithTheListOfThePlateaus() {
        val result = run("-w", workspace().toString(), "views", "generate", "--plateau", "nope");
        assertEquals(1, result.exit);
        assertTrue(
            result.err.contains("unknown plateau `nope`: the plateaus of this workspace are `as-is`, `to-be`"),
            result.err
        );
    }

    @Test
    @SneakyThrows
    void plateauAddCopiesTheFolderAndKeepsTheComments() {
        val workspace = workspace();
        val result = run(
            "-w",
            workspace.toString(),
            "plateau",
            "add",
            "p3",
            "--from",
            "to-be",
            "--name",
            "Phase 3",
            "--horizon",
            "2028"
        );
        assertEquals(0, result.exit, result.err);
        assertTrue(result.out.contains("plateau `p3` added"), result.out);
        assertTrue(Files.exists(dir.resolve("plateaus/30_p3/crm.yaml")));
        val text = Files.readString(workspace);
        assertTrue(text.startsWith("# two states\n"), text);
        assertTrue(
            text.endsWith(
                "    - id: p3\n      name: \"Phase 3\"\n      horizon: \"2028\"\n      path: plateaus/30_p3\n"
            ),
            text
        );
        // the new plateau is the last: it is the one read by default
        val graph = run("-w", workspace.toString(), "query", "graph");
        assertEquals(0, graph.exit, graph.err);
    }

    @Test
    void plateauAddNeedsFrom() {
        val result = run("-w", workspace().toString(), "plateau", "add", "p3");
        assertEquals(2, result.exit);
        assertTrue(result.err.contains("--from"), result.err);
    }
}

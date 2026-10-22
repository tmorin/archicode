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
 * The plateaus from the command line: {@code --plateau} on the commands that load a workspace.
 */
@QuarkusTest
class PlateauCliTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

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

    private static String plateau(String id, String override) {
        return """
        header:
          kind: "archicode.morin.io/plateau"
          version: "1"
        content:
          id: "%s"
        %s""".formatted(id, override == null ? "" : "  override: \"" + override + "\"\n");
    }

    /** Two states: {@code as-is} is an empty layer over the shop, {@code to-be} adds a system on top of it. */
    @SneakyThrows
    private Path workspace() {
        Files.createDirectories(dir.resolve("plateaus/10_as-is"));
        Files.createDirectories(dir.resolve("plateaus/20_to-be"));
        Files.writeString(dir.resolve("plateaus/10_as-is/shop.yaml"), system("shop", "Shop"));
        Files.writeString(dir.resolve("plateaus/10_as-is/plateau.yaml"), plateau("as-is", null));
        Files.writeString(dir.resolve("plateaus/20_to-be/plateau.yaml"), plateau("to-be", "as-is"));
        Files.writeString(
            dir.resolve("plateaus/20_to-be/crm.yaml"),
            system("crm", "CRM").replace("version: \"1\"\n", "version: \"1\"\n  plateau: \"to-be\"\n")
        );
        Files.writeString(
            dir.resolve(".archicode.yaml"),
            "# two states\nsettings:\n  manifests:\n    paths: [\"plateaus/**\"]\n"
        );
        return dir.resolve(".archicode.yaml");
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
            errorOutput.install(commandLine);
            val exit = commandLine.execute(args);
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    @Test
    void thePlateauAskedForIsTheOneThatIsGenerated() {
        val workspace = workspace();
        // `--plateau` is accepted by the commands that load a workspace; without it the last plateau is read. Each plateau
        // has its own folder, named after it: `-o out` is the beginning of the name (`out-as-is`)
        val as = run("-w", workspace.toString(), "views", "generate", "--plateau", "as-is", "-o", "out");
        assertEquals(0, as.exit, as.err);
        val last = run("-w", workspace.toString(), "views", "generate", "-o", "out");
        assertEquals(0, last.exit, last.err);
        assertFalse(Files.exists(dir.resolve("out-as-is/plantuml/application/crm-overview.puml")));
        assertTrue(Files.exists(dir.resolve("out-to-be/plantuml/application/crm-overview.puml")));
        assertTrue(Files.exists(dir.resolve("out-as-is/plantuml/application/shop-overview.puml")));
        // two plateaus do not overwrite one another, and nothing is written where a workspace without plateaus writes
        assertFalse(Files.exists(dir.resolve("out")));
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
            result.err.contains(
                "unknown plateau `nope`: the plateaus of this workspace are `baseline`, `as-is` and `to-be`"
            ),
            result.err
        );
    }
}

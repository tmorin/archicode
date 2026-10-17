package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A manifest of {@code kind: plateau} and a manifest with a {@code plateau} in its header are layered plateaus, which
 * ArchiCode does not know yet (#30): they are never recognised, and the command line refuses them with one line that
 * names the key, as it refuses the {@code from} of a plateau. The editor says the same sentence
 * ({@code shipped-files-layered-plateau.test.js} runs the same cases). Every other kind and key keeps its message.
 */
@QuarkusTest
class LayeredPlateauRefusalTest {

    private static final String LATER =
        " is not supported yet: layered plateaus (a plateau written as an increment on top of another one) are reserved" +
        " for a later version of ArchiCode (see #30). Give each plateau its own folder of manifests in" +
        " `settings.plateaus` instead";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private CliHarness.Result run(String kind, String headerKey, String... command) {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/shop.yaml"),
            """
            header:
              kind: "%s"
            %s  version: "1"
            content:
              id: "shop"
              name: "Shop"
            """.formatted(kind, headerKey)
        );
        Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        val args = new java.util.ArrayList<>(List.of("-w", dir.resolve("workspace.yaml").toString()));
        args.addAll(List.of(command));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    private static void assertOneLine(CliHarness.Result result, String expected) {
        assertEquals(1, result.exit(), result.err());
        assertEquals(List.of(expected), result.err().lines().toList(), result.err());
        assertFalse(result.err().contains("\tat "), "no stack trace: " + result.err());
        assertFalse(result.err().contains("Exception"), "no class name: " + result.err());
        assertEquals("", result.out());
    }

    @Test
    void shouldRefuseTheKindPlateauWithOneLine() {
        for (val command : List.of(List.of("query", "graph"), List.of("views", "generate"))) {
            assertOneLine(
                run("archicode.morin.io/plateau", "", command.toArray(String[]::new)),
                "error: `manifests/shop.yaml` is not valid: `kind: plateau`" + LATER
            );
        }
    }

    @Test
    void shouldRefuseTheBareKindPlateauToo() {
        assertOneLine(
            run("plateau", "", "query", "graph"),
            "error: `manifests/shop.yaml` is not valid: `kind: plateau`" + LATER
        );
    }

    @Test
    void shouldRefuseThePlateauKeyOfTheHeaderWithOneLine() {
        for (val command : List.of(List.of("query", "graph"), List.of("views", "generate"))) {
            assertOneLine(
                run("archicode.morin.io/system", "  plateau: \"later\"\n", command.toArray(String[]::new)),
                "error: `manifests/shop.yaml` is not valid: `header.plateau`" + LATER
            );
        }
    }

    @Test
    void shouldKeepTheMessageOfAnotherUnknownKey() {
        val result = run("archicode.morin.io/system", "  nothing: \"x\"\n", "query", "graph");
        assertOneLine(
            result,
            "error: `manifests/shop.yaml` is not valid: unknown key `nothing` (known: kind, parent, version) at `header.nothing` (line 3, column 15)"
        );
    }

    @Test
    void shouldKeepTheMessageOfAnotherUnknownKind() {
        val result = run("archicode.morin.io/nothing", "", "query", "graph");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(
            result
                .err()
                .startsWith(
                    "error: `manifests/shop.yaml` is not valid: Cannot deserialize value of type `io.morin.archicode.manifest.ManifestKind` from String \"archicode.morin.io/nothing\": not one of the values accepted for Enum class: ["
                ),
            result.err()
        );
        assertTrue(result.err().endsWith("] at `header.kind` (line 2, column 9)\n"), result.err());
        assertFalse(result.err().contains("plateau"), result.err());
    }
}

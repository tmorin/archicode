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
 * A manifest of {@code kind: plateau} and a manifest with a {@code plateau} in its header are the layered plateaus of wave 014
 * (run 0077): the place-holder refusal that wave 013 put in their place (#30) is gone, and the command line reads them. The
 * cases of the tree itself are in {@code PlateauModelTest}; this class holds what is the command line's alone: the kinds read
 * in any case, the sentences of the other unknown keys and kinds, which now know the plateau, and the order of the checks. The
 * editor says the same sentences ({@code shipped-files-layered-plateau.test.js} runs the same cases).
 */
@QuarkusTest
class LayeredPlateauTest {

    private static final String KINDS =
        "archicode.morin.io/component, archicode.morin.io/container, archicode.morin.io/environment, " +
        "archicode.morin.io/node, archicode.morin.io/person, archicode.morin.io/plateau, " +
        "archicode.morin.io/solution, archicode.morin.io/story, archicode.morin.io/system, " +
        "archicode.morin.io/view";

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
        Files.writeString(dir.resolve(".archicode.yaml"), "settings: {}\n");
        val args = new java.util.ArrayList<>(List.of("-w", dir.resolve(".archicode.yaml").toString()));
        args.addAll(List.of(command));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    @SneakyThrows
    private CliHarness.Result runManifest(String manifest) {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/shop.yaml"), manifest);
        Files.writeString(dir.resolve(".archicode.yaml"), "settings: {}\n");
        return CliHarness.run(factory, errorOutput, "-w", dir.resolve(".archicode.yaml").toString(), "query", "graph");
    }

    private static void assertOneLine(CliHarness.Result result, String expected) {
        assertEquals(1, result.exit(), result.err());
        assertEquals(List.of(expected), result.err().lines().toList(), result.err());
        assertFalse(result.err().contains("\tat "), "no stack trace: " + result.err());
        assertFalse(result.err().contains("Exception"), "no class name: " + result.err());
        assertEquals("", result.out());
    }

    @Test
    void shouldReadTheKindPlateau() {
        for (val command : List.of(List.of("query", "graph"), List.of("views", "generate"))) {
            val result = run("archicode.morin.io/plateau", "", command.toArray(String[]::new));
            assertEquals(0, result.exit(), result.err());
            assertEquals("", result.err());
        }
    }

    @Test
    void shouldReadThePlateauKeyOfTheHeaderAndWarnThatOnlyTheHeaderNamesIt() {
        for (val command : List.of(List.of("query", "graph"), List.of("views", "generate"))) {
            val result = run("archicode.morin.io/system", "  plateau: \"later\"\n", command.toArray(String[]::new));
            assertEquals(0, result.exit(), result.err());
            assertEquals(
                List.of(
                    "warning: the plateau `later` exists only through the `plateau` key of the header of `manifests/shop.yaml`: it has no manifest of kind `archicode.morin.io/plateau`, so it overrides `baseline` and has no name"
                ),
                result.err().lines().toList()
            );
        }
    }

    @Test
    void shouldKeepTheMessageOfAnotherUnknownKey() {
        val result = run("archicode.morin.io/system", "  nothing: \"x\"\n", "query", "graph");
        assertOneLine(
            result,
            "error: `manifests/shop.yaml` is not valid: unknown key `nothing` (known: kind, parent, plateau, version) at `header.nothing` (line 3, column 15)"
        );
    }

    @Test
    void shouldSayAnotherUnknownKindInOneSentenceThatTheEditorSaysToo() {
        val result = run("archicode.morin.io/nothing", "", "query", "graph");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: `manifests/shop.yaml` is not valid: unrecognized `header.kind` \"archicode.morin.io/nothing\" (known: " +
                KINDS +
                ") (line 2, column 9)\n",
            result.err()
        );
        assertFalse(result.err().contains("io.morin.archicode."), "no Java class name: " + result.err());
    }

    @Test
    void shouldTellTheVersionThatIsMissingOfAPlateauAsOfAnyKind() {
        // the kind is read like any other: the reader finds the end of the header, where the version would be
        assertOneLine(
            runManifest("header:\n  kind: \"archicode.morin.io/plateau\"\ncontent:\n  id: \"shop\"\n"),
            "error: `manifests/shop.yaml` is not valid: Missing header.version"
        );
        assertOneLine(
            runManifest(
                "header:\n  kind: \"archicode.morin.io/system\"\n  plateau: \"later\"\ncontent:\n  id: \"shop\"\n"
            ),
            "error: `manifests/shop.yaml` is not valid: Missing header.version"
        );
    }

    @Test
    void shouldTreatAPlateauKeyOfTheContentAsAnyUnknownKey() {
        assertOneLine(
            runManifest(
                "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"shop\"\n  plateau: \"later\"\n"
            ),
            "error: `manifests/shop.yaml` is not valid: unknown key `plateau` (known: description, elements, id, name, qualifiers, relationships, replaces, tags) at `plateau`"
        );
    }

    @Test
    void shouldAcceptAKindInAnyCaseAndWithSpacesAroundItAsTheEditorDoes() {
        val result = runManifest(
            "header:\n  kind: \"  ARCHICODE.Morin.IO/System \"\n  version: \"1\"\ncontent:\n  id: \"shop\"\n"
        );
        assertEquals(0, result.exit(), result.err());
    }
}

package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.Warnings;
import io.morin.archicode.cli.ArchiCode;
import io.morin.archicode.cli.ErrorOutput;
import io.morin.archicode.resource.plateau.Plateau;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * The plateau model on the command line (run 0077, wave 014, W-3): the header key {@code plateau} on every kind of manifest,
 * the manifest of kind {@code plateau} with its patches, the tree of the plateaus and the references declared once in a chain
 * of plateaus. The cases are in {@code plateau-model-cases.json}, which the editor runs too ({@code plateau-model.test.js}):
 * the two tools accept the same manifests and refuse the same ones with the same sentence. Every mistake is one {@code error:}
 * line, with no stack trace and no Java class name; every oddity is a {@code warning:} line.
 */
@QuarkusTest
class PlateauModelTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/plateau-model-cases.json");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Warnings warnings;

    @TempDir
    Path dir;

    @SneakyThrows
    private static JsonNode cases() {
        return JSON.readTree(Files.readString(CASES)).get("cases");
    }

    static Stream<String> caseIds() {
        val ids = new ArrayList<String>();
        cases().forEach(c -> ids.add(c.get("id").asText()));
        return ids.stream();
    }

    private static JsonNode caseOf(String id) {
        for (val c : cases()) {
            if (c.get("id").asText().equals(id)) {
                return c;
            }
        }
        throw new IllegalArgumentException("no case " + id);
    }

    private record Result(int exit, String out, String err) {}

    private Result run(String... args) {
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
            errorOutput.install(commandLine);
            val exit = commandLine.execute(args);
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    /** The folder of a case: workspace.yaml and the files. */
    @SneakyThrows
    private Path build(JsonNode c) {
        Files.writeString(
            dir.resolve("workspace.yaml"),
            c.has("settings") ? c.get("settings").asText() : "settings: {}\n"
        );
        for (val file : c.get("files").properties()) {
            val target = dir.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, file.getValue().asText());
        }
        return dir.resolve("workspace.yaml");
    }

    private static List<String> words(JsonNode array) {
        val out = new ArrayList<String>();
        array.forEach(a -> out.add(a.asText()));
        return out;
    }

    private static void assertOneMistake(Result result, List<String> lines, String label) {
        assertEquals(1, result.exit(), label + " -> " + result.err());
        assertEquals(lines, result.err().lines().toList(), label);
        assertFalse(result.err().contains("\tat "), label + ": no stack trace: " + result.err());
        assertFalse(result.err().contains("Exception"), label + ": no class name: " + result.err());
        assertFalse(result.err().contains("io.morin"), label + ": no Java class: " + result.err());
        assertEquals("", result.out(), label + ": nothing on the standard output");
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("caseIds")
    void shouldGiveTheSentenceOfTheCase(String id) {
        val c = caseOf(id);
        val workspace = build(c);
        val expect = c.get("expect");
        val label = id + ": " + c.get("what").asText();
        // a layered workspace is drawn plateau by plateau (run 0078): the cases say what `baseline` draws, as the editor does
        // until it reads the layers, so it is named; a workspace that is not layered has no plateau to name
        val layered = isLayered(workspace);
        val result = layered
            ? run("-w", workspace.toString(), "query", "graph", "--plateau", Plateau.BASELINE)
            : c.has("plateau")
              ? run("-w", workspace.toString(), "query", "graph", "--plateau", c.get("plateau").asText())
              : run("-w", workspace.toString(), "query", "graph");

        if (expect.has("fileError")) {
            val error = expect.get("fileError");
            assertOneMistake(
                result,
                List.of(
                    "error: `" +
                        error.get("file").asText() +
                        "` is not valid: " +
                        error.get("sentence").asText() +
                        error.get("where").asText()
                ),
                label
            );
        } else if (expect.has("errors")) {
            // one `error:` line for each mistake
            val lines = new ArrayList<String>();
            words(expect.get("errors")).forEach(e -> lines.add("error: " + e));
            assertOneMistake(result, lines, label);
        } else if (expect.has("removedKey")) {
            assertOneMistake(result, List.of("error: " + expect.get("removedKey").asText()), label);
        } else if (expect.has("noPlateau")) {
            // `settings.current` or `--plateau` in a workspace that has no plateau: the editor says the first in the same words
            assertOneMistake(result, List.of("error: " + expect.get("noPlateau").asText()), label);
        } else {
            assertEquals(0, result.exit(), label + " -> " + result.err());
            val told = new ArrayList<String>();
            words(expect.get("warnings")).forEach(w -> told.add("warning: " + w));
            assertEquals(told, result.err().lines().toList(), label);
            val loaded = new TreeSet<>(
                (layered
                    ? workspaceFactory.create(workspace, null, Plateau.BASELINE)
                    : workspaceFactory.create(workspace)
                ).appIndex.elementByReferenceIndex.keySet()
            );
            warnings.drain();
            assertEquals(new TreeSet<>(words(expect.get("loaded"))), loaded, label + ": what is drawn");
        }
    }

    /** Whether the workspace uses layered plateaus; false when it cannot be read (its mistake is the case). */
    private boolean isLayered(Path workspace) {
        try {
            return workspaceFactory.plateauTree(workspace).isLayered();
        } catch (ArchiCodeException e) {
            return false;
        } finally {
            warnings.drain();
        }
    }

    @Test
    void shouldCoverEveryRuleOfTheGate() {
        val text = cases().toString();
        for (val rule : List.of(
            "overrides `inhous`", // an override that names no plateau
            "form a cycle", // a cycle
            "`v1.2`", // an id with a dot
            "is declared twice: in `manifests/saas-again.yaml`", // a plateau declared twice
            "(found an array) at `override`", // a list given to override
            "exists only through", // a plateau that headers alone name
            "ids one letter apart", // an id one letter from another
            "`settings.plateaus` no longer exists" // the key of the old mechanism
        )) {
            assertTrue(text.contains(rule), "a case pins: " + rule);
        }
    }
}

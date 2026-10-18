package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * The negative variants of the document that today's tools can run (wave 013, run 0070), on the command line: each case of
 * {@code negative-cases.json} is the folders of Brightcart with one alteration, built in a temporary folder from
 * {@code folders/} (nothing negative is committed as a workspace), and the command gives one {@code error:} line, or a warning,
 * and exit code 1 or 0, without a stack trace. The editor runs the same file in {@code brightcart-negative.test.js} and says
 * the same sentence.
 */
@QuarkusTest
class BrightcartNegativeCasesTest {

    private static final Path CASES = Brightcart.ROOT.resolve("negative-cases.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private static JsonNode cases() {
        return Brightcart.MAPPER.readTree(Files.readString(CASES)).get("cases");
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

    /** The alteration of a case: the operations on the copy of {@code folders/}. */
    @SneakyThrows
    static void alter(Path root, JsonNode ops) {
        for (val op : ops) {
            val kind = op.get("op").asText();
            switch (kind) {
                case "replace" -> {
                    val file = root.resolve(op.get("file").asText());
                    val text = Files.readString(file);
                    val from = op.get("from").asText();
                    assertTrue(text.contains(from), "the text to replace is not in " + file + ": " + from);
                    val at = text.indexOf(from);
                    Files.writeString(
                        file,
                        text.substring(0, at) + op.get("to").asText() + text.substring(at + from.length())
                    );
                }
                case "write" -> {
                    val file = root.resolve(op.get("file").asText());
                    Files.createDirectories(file.getParent());
                    Files.writeString(file, op.get("text").asText());
                }
                case "copy" -> Files.copy(root.resolve(op.get("from").asText()), root.resolve(op.get("to").asText()));
                case "delete" -> {
                    try (val files = Files.walk(root.resolve(op.get("path").asText()))) {
                        for (val file : files.sorted(Comparator.reverseOrder()).toList()) {
                            Files.delete(file);
                        }
                    }
                }
                default -> throw new IllegalArgumentException("unknown operation " + kind);
            }
        }
    }

    private static List<String> words(JsonNode array) {
        val out = new ArrayList<String>();
        array.forEach(a -> out.add(a.asText()));
        return out;
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("caseIds")
    void shouldGiveTheSentenceOfTheCase(String id) {
        val c = caseOf(id);
        val workspace = Brightcart.copyFolders(dir);
        alter(dir, c.get("ops"));
        val cli = new Brightcart.Cli(factory, errorOutput);
        for (val command : c.get("cli")) {
            val args = words(command.get("args"));
            val label = id + ": archicode " + String.join(" ", args);
            val result = cli.in(workspace, args);
            assertEquals(command.get("exit").asInt(), result.exit(), label + " -> " + result.err());
            assertEquals(words(command.get("stderr")), result.err().lines().toList(), label);
            assertFalse(result.err().contains("\tat "), label + ": no stack trace: " + result.err());
            assertFalse(result.err().contains("Exception"), label + ": no class name: " + result.err());
            if (result.exit() != 0) {
                assertEquals("", result.out(), label + ": nothing on the standard output");
            }
            if (command.has("sameStdoutAs")) {
                val other = cli.in(workspace, words(command.get("sameStdoutAs")));
                assertEquals(0, other.exit(), label + " (the other command) -> " + other.err());
                assertFalse(result.out().isBlank(), label + ": something is written");
                assertEquals(other.out(), result.out(), label + ": the same output as " + command.get("sameStdoutAs"));
            }
        }
    }

    @Test
    void shouldCoverTheVariantsATodayToolRuns() {
        val variants = new HashSet<String>();
        val ids = new HashSet<String>();
        for (val c : cases()) {
            assertTrue(ids.add(c.get("id").asText()), "a case id is used twice: " + c.get("id"));
            variants.add(c.get("variant").asText());
            assertTrue(
                c.get("editor").isArray() || !c.path("reason").asText().isBlank(),
                c.get("id") + ": the editor runs it, or says why not"
            );
            assertTrue(c.get("cli").size() > 0, c.get("id") + ": a command");
        }
        assertTrue(variants.containsAll(List.of("V2", "V11")), "V2 and V11 are run: " + variants);
    }
}

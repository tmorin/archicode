package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The drift guard (wave 029, run 0210, DEC-4 and DEC-5): the model in {@code docs/architecture} must not say what the
 * repository no longer is. One way only: a layer of {@code layers.json} that the model lacks is no problem. The guard
 * is pure over data ({@link #problems}), so a sabotage is a copy edited in memory or in a temp folder; each sentence
 * starts with the tag of its rule.
 */
@QuarkusTest
class ArchitectureDriftTest {

    static final String RULE_NO_LAYER = "[rule 1: a modeled layer exists]";
    static final String RULE_KNOWN_LAYER = "[rule 2: a modeled layer is in layers.json]";
    static final String RULE_LAYER_ORDER = "[rule 3: a layer uses the layer before it]";
    static final String RULE_PATH = "[rule 4: tags.path exists]";

    private static final Path WORKSPACE = Path.of("docs/architecture/.archicode.yaml");
    private static final Path LAYERS = Path.of("src/main/editor/layers.json");
    private static final String EDITOR = "archicode.editor.";
    private static final String EDITOR_PATH = "src/main/editor/";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    io.morin.archicode.cli.ErrorOutput errorOutput;

    private static void collect(String reference, JsonNode element, Map<String, JsonNode> into) {
        into.put(reference, element);
        for (val child : element.path("elements")) {
            collect(reference + "." + child.get("id").asText(), child, into);
        }
    }

    private static Map<String, JsonNode> elements(JsonNode graph) {
        val result = new LinkedHashMap<String, JsonNode>();
        graph.get("elements").forEach(root -> collect(root.get("reference").asText(), root.get("element"), result));
        return result;
    }

    /** The paths an element writes in {@code tags.path}: none for an element with no {@code tags} or no {@code path}. */
    private static List<String> pathsOf(JsonNode element) {
        val result = new ArrayList<String>();
        val path = element.path("tags").path("path");
        if (path.isTextual()) {
            for (val part : path.asText().split(",")) {
                if (!part.isBlank()) {
                    result.add(part.trim());
                }
            }
        }
        return result;
    }

    private static boolean uses(JsonNode graph, String source, String destination) {
        for (val relationship : graph.get("relationships")) {
            if (
                source.equals(relationship.get("source").asText()) &&
                destination.equals(relationship.get("relationship").get("destination").asText())
            ) {
                for (val qualifier : relationship.get("relationship").path("qualifiers")) {
                    if ("uses".equals(qualifier.asText())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /** The sentences that say the model drifted from the repository; empty when it is true. */
    static List<String> problems(JsonNode graph, JsonNode layers, Path root) {
        val problems = new ArrayList<String>();
        val elements = elements(graph);

        // Rule 1: the modeled layers, in the order of the model's references.
        val modeled = new ArrayList<String>();
        elements.forEach((reference, element) -> {
            if (reference.startsWith(EDITOR) && reference.indexOf('.', EDITOR.length()) < 0) {
                val id = reference.substring(EDITOR.length());
                if (pathsOf(element).contains(EDITOR_PATH + id)) {
                    modeled.add(id);
                }
            }
        });
        if (modeled.isEmpty()) {
            problems.add(RULE_NO_LAYER + " no element archicode.editor.<id> has tags.path src/main/editor/<id>");
        }

        // Rule 2.
        val order = new ArrayList<String>();
        layers.path("layers").forEach(l -> order.add(l.asText()));
        for (val id : modeled) {
            if (!order.contains(id)) {
                problems.add(
                    RULE_KNOWN_LAYER + " `" + id + "` is modeled but is not in " + LAYERS + " (layers: " + order + ")"
                );
            }
        }

        // Rule 3: of two modeled layers that are neighbours in layers.json, the later one uses the earlier one.
        for (var i = 1; i < order.size(); i++) {
            val earlier = order.get(i - 1);
            val later = order.get(i);
            if (
                modeled.contains(earlier) && modeled.contains(later) && !uses(graph, EDITOR + later, EDITOR + earlier)
            ) {
                problems.add(
                    RULE_LAYER_ORDER +
                        " " +
                        LAYERS +
                        " puts `" +
                        later +
                        "` right after `" +
                        earlier +
                        "`, but the model has no `uses` from " +
                        EDITOR +
                        later +
                        " to " +
                        EDITOR +
                        earlier
                );
            }
        }

        // Rule 4: every tags.path entry is relative, free of .., and exists; at least one is checked.
        var checked = 0;
        for (val entry : elements.entrySet()) {
            for (val path : pathsOf(entry.getValue())) {
                checked++;
                val segments = path.replace('\\', '/').split("/");
                if (path.startsWith("/") || path.matches("^[A-Za-z]:.*") || List.of(segments).contains("..")) {
                    problems.add(
                        RULE_PATH +
                            " " +
                            entry.getKey() +
                            " has tags.path `" +
                            path +
                            "`, which is not relative to the repository"
                    );
                } else if (!Files.exists(root.resolve(path))) {
                    problems.add(
                        RULE_PATH + " " + entry.getKey() + " has tags.path `" + path + "`, which does not exist"
                    );
                }
            }
        }
        if (checked == 0) {
            problems.add(RULE_PATH + " no element has a tags.path: nothing was checked");
        }
        return problems;
    }

    @SneakyThrows
    private static JsonNode layers() {
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(LAYERS.toFile());
    }

    private JsonNode graph(Path workspace) {
        return ArchitectureGraph.load(workspace, factory, errorOutput);
    }

    private static void assertRule(List<String> problems, String rule) {
        assertTrue(
            problems.stream().anyMatch(p -> p.startsWith(rule)),
            "expected a problem of " + rule + ", got " + problems
        );
    }

    /** FLOW-2 (f): the repository, unmodified. */
    @Test
    void shouldFindNoProblemOnTheRepository() {
        assertEquals(List.of(), problems(graph(WORKSPACE), layers(), Path.of("")));
    }

    /** FLOW-2 (c): a layer renamed in layers.json is no longer the one the model names. */
    @Test
    void shouldFailRule2WhenALayerIsRenamed() {
        val layers = layers().deepCopy();
        val names = (ArrayNode) layers.get("layers");
        assertEquals("core", names.get(0).asText());
        names.set(0, names.textNode("kernel"));
        val problems = problems(graph(WORKSPACE), layers, Path.of(""));
        assertRule(problems, RULE_KNOWN_LAYER);
        assertTrue(problems.stream().anyMatch(p -> p.contains("`core` is modeled")), problems.toString());
    }

    /** FLOW-2 (d): model and persistence swapped, so a neighbour pair has no `uses`. */
    @Test
    void shouldFailRule3WhenTwoLayersAreSwapped() {
        val layers = layers().deepCopy();
        val names = (ArrayNode) layers.get("layers");
        assertEquals("model", names.get(1).asText());
        assertEquals("persistence", names.get(2).asText());
        names.set(1, names.textNode("persistence"));
        names.set(2, names.textNode("model"));
        val problems = problems(graph(WORKSPACE), layers, Path.of(""));
        assertRule(problems, RULE_LAYER_ORDER);
        assertTrue(
            problems.stream().anyMatch(p -> p.contains("`persistence` right after `core`")),
            problems.toString()
        );
    }

    /** FLOW-2 (e): a copy of the model, one tags.path made missing, loaded through the command line. */
    @Test
    @SneakyThrows
    void shouldFailRule4WhenATagsPathDoesNotExist(@TempDir Path temp) {
        val source = Path.of("docs/architecture");
        try (Stream<Path> files = Files.walk(source)) {
            for (val file : files.toList()) {
                val target = temp.resolve(source.relativize(file).toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(file, target);
                }
            }
        }
        val manifest = temp.resolve("manifests/archicode.yaml");
        val text = Files.readString(manifest);
        val real = "src/main/editor/core/read-schema.js";
        assertTrue(text.contains(real), "the sabotage needs " + real + " in the manifest");
        Files.writeString(manifest, text.replace(real, "src/main/editor/core/gone-schema.js"));
        val problems = problems(graph(temp.resolve(".archicode.yaml")), layers(), Path.of(""));
        assertRule(problems, RULE_PATH);
        assertTrue(problems.stream().anyMatch(p -> p.contains("gone-schema.js")), problems.toString());
    }

    @Test
    void shouldFailRule4ForAPathThatEscapesTheRepository() {
        val graph = graph(WORKSPACE).deepCopy();
        val first = (ObjectNode) graph.get("elements").get(0).get("element");
        val tags =
            first.has("tags") && first.get("tags").isObject()
                ? (ObjectNode) first.get("tags")
                : first.putObject("tags");
        tags.put("path", "../outside, /etc/passwd");
        val problems = problems(graph, layers(), Path.of(""));
        assertEquals(
            2,
            problems
                .stream()
                .filter(p -> p.startsWith(RULE_PATH) && p.contains("not relative"))
                .count(),
            problems.toString()
        );
    }

    @Test
    void shouldFailRule1WhenNoLayerIsModeled() {
        val graph = graph(WORKSPACE).deepCopy();
        ((ArrayNode) graph.get("elements")).removeAll();
        val problems = problems(graph, layers(), Path.of(""));
        assertRule(problems, RULE_NO_LAYER);
        assertRule(problems, RULE_PATH);
        assertFalse(problems.isEmpty());
    }
}

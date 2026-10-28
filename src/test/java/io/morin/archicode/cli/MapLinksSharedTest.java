package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The command line side of the contract the editor shares with it for the {@code links} of a Map (wave 026, run 0199, issue
 * #143; decision DEC-8 of the TDD, requirements REQ-3 and REQ-4). {@code map-links/expected-boxes.json} was written from this
 * command line; {@code map-links-shared.test.js} asserts the editor against it, and this test asserts the command line against
 * it, so either side drifting fails a test. Every case runs {@code views generate -i} on a temporary copy of its workspace, to
 * which the view of the case is added: the shipped files are never written. A second test reads back what an editor-style rename
 * of an end writes (the element and every entry that names it), as the editor's save writes it.
 */
@QuarkusTest
class MapLinksSharedTest {

    private static final Path CONTRACT = Path.of("src/test/resources/map-links/expected-boxes.json");
    private static final Pattern BOX = Pattern.compile(
        "^(?:rectangle|actor|person|database|component|queue|storage) (\\S+)(?: as | <<).*$"
    );
    private static final Pattern LINK = Pattern.compile("^(\\S+) -\\S*> (\\S+)(?: : .*)?$");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private static void copy(Path from, Path to) {
        try (val files = Files.walk(from)) {
            for (val file : files.toList()) {
                val relative = from.relativize(file);
                // the views a previous run wrote are not manifests and are not copied
                if (relative.getNameCount() > 0 && relative.getName(0).toString().startsWith("views")) {
                    continue;
                }
                val target = to.resolve(relative.toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(file, target);
                }
            }
        }
    }

    /** The manifest of a saved Map view of the application layer with these properties (JSON is YAML). */
    @SneakyThrows
    private static String viewManifest(String id, JsonNode properties) {
        return "header:\n  kind: \"archicode.morin.io/view\"\n  version: \"1\"\ncontent:\n  id: \"%s\"\n  viewpoint: \"map\"\n  layer: \"application\"\n  properties: %s\n".formatted(
            id,
            MAPPER.writeValueAsString(properties)
        );
    }

    @SneakyThrows
    private CliHarness.Result generate(Path root, String plateau, String against, String view) {
        val args = new ArrayList<>(
            List.of("-w", root.resolve(".archicode.yaml").toString(), "views", "generate", "--plateau", plateau)
        );
        if (against != null) {
            args.addAll(List.of("--against", against));
        }
        args.addAll(List.of("-i", view));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    /** The lines of the file the command line wrote for the view, or null when it wrote none. */
    @SneakyThrows
    private static Optional<List<String>> written(Path root, String folder, String view) {
        val views = root.resolve(folder);
        if (!Files.isDirectory(views)) {
            return Optional.empty();
        }
        try (val files = Files.walk(views)) {
            val file = files
                .filter(p ->
                    p
                        .getFileName()
                        .toString()
                        .equals(view + ".puml")
                )
                .findFirst();
            return file.isPresent() ? Optional.of(Files.readAllLines(file.get())) : Optional.empty();
        }
    }

    private static List<String> boxesOf(List<String> lines) {
        val out = new TreeSet<String>();
        for (val line : lines) {
            val m = BOX.matcher(line);
            if (m.matches()) {
                out.add(m.group(1));
            }
        }
        return List.copyOf(out);
    }

    private static List<String> linksOf(List<String> lines) {
        val out = new TreeSet<String>();
        for (val line : lines) {
            val m = LINK.matcher(line);
            if (m.matches()) {
                out.add(m.group(1) + " -> " + m.group(2));
            }
        }
        return List.copyOf(out);
    }

    /** The links the file draws heavy: the highlight of the contract is the heaviest line of the view ({@code thickness=5}). */
    private static List<String> highlightedOf(List<String> lines) {
        val out = new TreeSet<String>();
        for (val line : lines) {
            val m = LINK.matcher(line);
            if (m.matches() && line.contains("thickness=5")) {
                out.add(m.group(1) + " -> " + m.group(2));
            }
        }
        return List.copyOf(out);
    }

    /** The manifest of a story of one step: the recipe of the case, told at its plateau, with the keys of the step. */
    @SneakyThrows
    private static String storyManifest(JsonNode spec) {
        val step = MAPPER.createObjectNode();
        step.put("viewpoint", "map");
        step.put("layer", "application");
        step.set("properties", spec.path("properties"));
        step.put("at", spec.path("plateau").asText());
        spec.path("step")
            .properties()
            .forEach(e -> step.set(e.getKey(), e.getValue()));
        val content = MAPPER.createObjectNode();
        content.put("id", "tour");
        content.putArray("steps").add(step);
        return "header:\n  kind: \"archicode.morin.io/story\"\n  version: \"1\"\ncontent: %s\n".formatted(
            MAPPER.writeValueAsString(content)
        );
    }

    /** The lines of the one file {@code stories generate} wrote for the step. */
    @SneakyThrows
    private List<String> storyStep(Path root, String plateau) {
        val result = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            root.resolve(".archicode.yaml").toString(),
            "stories",
            "generate",
            "--plateau",
            plateau,
            "--story",
            "tour"
        );
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err(), "it says nothing");
        try (val files = Files.walk(root)) {
            val found = files
                // the facets of the settings draw the step again beside it: the global drawing is the folder named for the view alone
                .filter(
                    p -> "step_01.puml".equals(p.getFileName().toString()) && p.toString().contains("/tour/01-map/")
                )
                .toList();
            assertEquals(1, found.size(), "one file for the one step: " + found);
            return Files.readAllLines(found.get(0));
        }
    }

    private static List<String> strings(JsonNode list) {
        val out = new ArrayList<String>();
        list.forEach(node -> out.add(node.asText()));
        return out;
    }

    @Test
    @SneakyThrows
    void shouldDrawTheBoxesAndTheLinksTheEditorDrawsForEveryCaseOfTheContract() {
        val contract = MAPPER.readTree(CONTRACT.toFile());
        var cases = 0;
        var skipped = 0;
        var stepCases = 0;
        var n = 0;
        for (val entry : contract.path("workspaces")) {
            val source = Path.of(entry.path("workspace").asText());
            val before = snapshot(source);
            for (val c : entry.path("cases").properties()) {
                val name = c.getKey();
                val spec = c.getValue();
                val root = dir.resolve("case" + n);
                n++;
                copy(source, root);
                Files.writeString(
                    root.resolve(entry.path("folder").asText()).resolve("view." + name + ".yaml"),
                    viewManifest(name, spec.path("properties"))
                );
                val plateau = spec.path("plateau").asText();
                val against = spec.has("against") ? spec.path("against").asText() : null;
                val facet = spec.has("facet") ? spec.path("facet").asText() : null;
                val result = generate(root, plateau, against, name);
                assertEquals(0, result.exit(), name + ": " + result.err());
                val folder =
                    "views-" + plateau + (against == null ? "" : "-vs-" + against) + (facet == null ? "" : "-" + facet);
                val lines = written(root, folder, name);
                if (spec.path("drawn").asBoolean()) {
                    assertTrue(lines.isPresent(), name + ": the command line wrote nothing in " + folder);
                    assertEquals(strings(spec.path("boxes")), boxesOf(lines.get()), name + ": boxes");
                    assertEquals(strings(spec.path("links")), linksOf(lines.get()), name + ": links");
                    if (!spec.has("step")) {
                        assertEquals(
                            strings(spec.path("highlighted")),
                            highlightedOf(lines.get()),
                            name + ": the heavy links"
                        );
                    }
                } else {
                    assertTrue(lines.isEmpty(), name + ": the view is skipped, nothing is written");
                    assertEquals(List.of(), strings(spec.path("boxes")), name);
                    assertEquals(List.of(), strings(spec.path("links")), name);
                    skipped++;
                }
                if (spec.has("step") && spec.path("drawn").asBoolean()) {
                    Files.writeString(
                        root.resolve(entry.path("folder").asText()).resolve("story." + name + ".yaml"),
                        storyManifest(spec)
                    );
                    val step = storyStep(root, plateau);
                    assertEquals(strings(spec.path("boxes")), boxesOf(step), name + ": boxes of the step");
                    assertEquals(strings(spec.path("links")), linksOf(step), name + ": links of the step");
                    assertEquals(
                        strings(spec.path("highlighted")),
                        highlightedOf(step),
                        name + ": the heavy links of the step"
                    );
                    stepCases++;
                }
                if (spec.has("cli")) {
                    assertEquals(spec.path("cli").asText().strip(), result.err().strip(), name + ": what it says");
                } else {
                    assertEquals("", result.err(), name + ": it says nothing");
                }
                cases++;
            }
            assertEquals(before, snapshot(source), "the shipped workspace is left untouched");
        }
        assertTrue(cases >= 15, "cases: " + cases);
        assertTrue(stepCases >= 4, "step cases: " + stepCases);
        assertTrue(skipped >= 1, "a view the command line skips");
    }

    /** The paths and sizes of the files of a folder, to show that nothing was written in it. */
    @SneakyThrows
    private static List<String> snapshot(Path folder) {
        try (val files = Files.walk(folder)) {
            return files
                .map(p -> folder.relativize(p) + ":" + p.toFile().length() + ":" + p.toFile().lastModified())
                .sorted()
                .toList();
        }
    }

    @Test
    @SneakyThrows
    void shouldDrawTheRenamedEndAfterTheRewriteTheEditorMakesOfTheElementAndOfTheEntries() {
        val root = dir.resolve("rename");
        copy(Path.of("src/doc/examples/domain_plateaus"), root);
        val properties = MAPPER.readTree(
            "{\"opened\":[\"shop\"],\"links\":[{\"source\":\"shop.web\",\"destination\":\"shop.catalog\",\"label\":\"reads\"}]}"
        );
        val manifests = root.resolve("plateaus/baseline");
        Files.writeString(manifests.resolve("view.renamed.yaml"), viewManifest("renamed", properties));
        // before: the contract's own case
        assertEquals(0, generate(root, "baseline", null, "renamed").exit());
        val before = written(root, "views-baseline", "renamed").orElseThrow();
        assertEquals(List.of("shop.web -> shop.catalog"), linksOf(before));
        // the rename as the editor writes it: the id of the element, and every reference to it, in the plateaus, the views and the steps
        try (val files = Files.walk(root.resolve("plateaus"))) {
            for (val file : files.filter(Files::isRegularFile).toList()) {
                val text = Files.readString(file);
                Files.writeString(
                    file,
                    text.replace("shop.catalog", "shop.books").replace("id: \"catalog\"", "id: \"books\"")
                );
            }
        }
        val result = generate(root, "baseline", null, "renamed");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
        val after = written(root, "views-baseline", "renamed").orElseThrow();
        assertEquals(List.of("shop", "shop.books", "shop.web"), boxesOf(after));
        assertEquals(List.of("shop.web -> shop.books"), linksOf(after));
        assertFalse(String.join("\n", after).contains("catalog"));
        assertTrue(String.join("\n", after).contains(": reads"), "the label never changes");
    }
}

package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import io.morin.archicode.cli.ArchiCode;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * Wave 024, run 0179 (W-2), issue #167: no step of a shipped story draws nothing, for the command line as for the editor.
 * The editor's rule is {@code diagramHasNothingToDraw}: one box or none and no link is "Nothing to show". On the PlantUML
 * file {@code stories generate} writes, a box is a declaration of an element and a link is an arrow between two ids, so a
 * step file is empty when it holds no link and fewer than two elements. The stories and their steps are discovered (the
 * manifests of the workspace and the folders the command writes), never listed; the steps that are empty on purpose are
 * in {@code src/test/resources/stories/empty-steps.json} (an array of {@code { story, step, reason }}, {@code step}
 * counted from 1), which the node test {@code story-steps-not-empty.test.js} reads too.
 */
@QuarkusTest
class StoriesNotEmptyTest {

    private static final Path PLATEAUS = Path.of("src/doc/examples/domain_plateaus");
    private static final Path BRIGHTCART = Path.of("src/test/resources/brightcart/layered");
    private static final Path EMPTY_STEPS = Path.of("src/test/resources/stories/empty-steps.json");

    /** A box: the declaration of an element, not a line of a style (those are {@code rectangle \{}). */
    private static final Pattern ELEMENT = Pattern.compile(
        "^(rectangle|person|actor|database|card|node|queue) [A-Za-z][\\w.-]* (as |<<)"
    );

    /** A link: an id, then an arrow ({@code -->}, {@code ..>}). */
    private static final Pattern LINK = Pattern.compile("^[A-Za-z][\\w.-]* +\\S*(->|\\.>)");

    private static final Pattern STEP_FOLDER = Pattern.compile("^(\\d\\d)-.+");

    private static final ObjectMapper YAML = new ObjectMapper(new YAMLFactory());

    @Inject
    CommandLine.IFactory factory;

    @TempDir
    Path dir;

    @SneakyThrows
    private static void copy(Path from, Path into) {
        try (Stream<Path> files = Files.walk(from)) {
            for (val source : files.toList()) {
                val relative = from.relativize(source).toString();
                if (relative.startsWith("views")) {
                    continue;
                }
                val target = into.resolve(relative);
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
    }

    private void generate(Path workspace, String... more) {
        val args = new ArrayList<>(List.of("--workspace", workspace.resolve(".archicode.yaml").toString()));
        args.addAll(List.of("stories", "generate"));
        args.addAll(List.of(more));
        val exit = new CommandLine(ArchiCode.class, factory).execute(args.toArray(String[]::new));
        assertEquals(0, exit, "stories generate " + workspace + " " + more.length);
    }

    /** The story ids of the workspace with their number of steps, read from the manifests. */
    @SneakyThrows
    private static List<String> storiesOf(Path workspace) {
        val found = new ArrayList<String>();
        try (Stream<Path> files = Files.walk(workspace)) {
            for (val file : files
                .filter(f -> f.toString().endsWith(".yaml"))
                .sorted()
                .toList()) {
                JsonNode root = YAML.readTree(file.toFile());
                if (
                    root != null &&
                    "archicode.morin.io/story".equals(root.path("header").path("kind").asText()) &&
                    root.path("content").path("steps").isArray()
                ) {
                    found.add(
                        root.path("content").path("id").asText() + ":" + root.path("content").path("steps").size()
                    );
                }
            }
        }
        return found;
    }

    /** Whether the file holds nothing to draw: no link and at most one box. */
    @SneakyThrows
    private static boolean drawsNothing(Path puml) {
        long boxes = 0;
        long links = 0;
        for (val line : Files.readAllLines(puml)) {
            if (ELEMENT.matcher(line).find()) {
                boxes++;
            } else if (LINK.matcher(line).find()) {
                links++;
            }
        }
        return links == 0 && boxes <= 1;
    }

    /** The global (no facet) folder of a step: the shortest name that begins with its number. */
    @SneakyThrows
    private static Path folderOf(Path story, String number) {
        try (Stream<Path> folders = Files.list(story)) {
            return folders
                .filter(f ->
                    f
                        .getFileName()
                        .toString()
                        .startsWith(number + "-")
                )
                .min(Comparator.comparingInt(f -> f.getFileName().toString().length()))
                .orElseThrow();
        }
    }

    @SneakyThrows
    private static Path pumlIn(Path folder) {
        try (Stream<Path> files = Files.walk(folder)) {
            return files
                .filter(f -> f.toString().endsWith(".puml"))
                .findFirst()
                .orElseThrow();
        }
    }

    /** Checks the steps of every story drawn into {@code workspace}; returns the keys {@code story/n} that draw nothing. */
    @SneakyThrows
    private static int check(Path workspace, List<String> empty, Set<String> drawn) {
        val stories = storiesOf(workspace);
        val root = workspace.resolve("views-stories");
        int checked = 0;
        val ids = new ArrayList<String>();
        for (val story : stories) {
            val id = story.substring(0, story.indexOf(':'));
            val count = Integer.parseInt(story.substring(story.indexOf(':') + 1));
            ids.add(id);
            for (int step = 1; step <= count; step++) {
                val key = id + "/" + step;
                val puml = pumlIn(folderOf(root.resolve(id), "%02d".formatted(step)));
                checked++;
                if (drawsNothing(puml)) {
                    empty.add(key);
                } else {
                    drawn.add(key);
                }
            }
        }
        try (Stream<Path> folders = Files.list(root)) {
            val written = new HashSet<String>(folders.map(f -> f.getFileName().toString()).toList());
            assertEquals(new HashSet<>(ids), written, "the command wrote the folders of the stories of the manifests");
        }
        try (Stream<Path> story = Files.list(root.resolve(ids.get(0)))) {
            assertTrue(story.allMatch(f -> STEP_FOLDER.matcher(f.getFileName().toString()).matches()));
        }
        return checked;
    }

    @Test
    @SneakyThrows
    void everyStepOfEveryShippedStoryDrawsSomethingOrIsListedAsEmptyOnPurpose() {
        val exceptions = YAML.readTree(EMPTY_STEPS.toFile());
        assertTrue(exceptions.isArray(), "the exceptions are an array");
        val listed = new HashSet<String>();
        for (val entry : exceptions) {
            assertTrue(entry.path("story").isTextual(), "an exception names a story");
            assertTrue(entry.path("step").isInt() && entry.path("step").asInt() >= 1, "an exception names a step");
            assertFalse(entry.path("reason").asText().isBlank(), "an exception has a reason");
            listed.add(entry.path("story").asText() + "/" + entry.path("step").asInt());
        }

        val empty = new ArrayList<String>();
        val drawn = new HashSet<String>();
        int checked = 0;

        val plateaus = dir.resolve("plateaus");
        copy(PLATEAUS, Files.createDirectories(plateaus));
        generate(plateaus);
        checked += check(plateaus, empty, drawn);

        // the plateau StoriesGenerateIT draws fork_tour at: a step with no `at` is drawn in the one chosen. `saas` is not
        // drawn: fork_tour/7 is told at `saas` and compared with it, which the command skips with a warning.
        val brightcart = dir.resolve("brightcart");
        copy(BRIGHTCART, Files.createDirectories(brightcart));
        generate(brightcart, "--plateau", "marketplace");
        checked += check(brightcart, empty, drawn);

        val unlisted = empty
            .stream()
            .filter(key -> !listed.contains(key))
            .distinct()
            .sorted()
            .toList();
        assertEquals(List.of(), unlisted, "steps that draw nothing and are not listed in empty-steps.json");
        for (val key : listed) {
            assertFalse(
                drawn.contains(key) && !empty.contains(key),
                key + " is listed but draws something: take it out"
            );
            assertTrue(empty.contains(key), key + " is listed but is not a step of a shipped story that draws nothing");
        }
        assertTrue(checked >= 17, "the steps of the shipped stories were counted, got " + checked);
    }
}

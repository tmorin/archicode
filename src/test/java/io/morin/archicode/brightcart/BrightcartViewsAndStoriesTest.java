package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * The views and the stories that the layered Brightcart ships (wave 016, run 0110, issue #115): the folder {@code
 * layered/shared/}, written by {@code generate.mjs} and described by {@code expected/entries.json}, which the generator works
 * out from the model (the plateaus each view can be drawn in, and the sentences the command line says where it cannot). They
 * belong to no plateau (wave 015, run 0100), so the command line loads them with every plateau, checks what they name once
 * after the layers, and checks the {@code at} and {@code against} of every step of a story; it does not draw a story.
 *
 * <p>A saved view is drawn only when it is named ({@code views generate -i <id>}), so none of them is in the files that the
 * plain {@code views generate} of {@link BrightcartLayeredViewsTest} counts. Here the command line is asked for all of them,
 * in each plateau, on a copy of {@code layered/}: it draws the ones the plateau can draw, skips the others and warns, and
 * leaves out of a map the entries the plateau lacks, exactly as {@code entries.json} says. {@code BrightcartLayeredDiffTest}
 * pins that the tables of the comparisons did not change.
 */
@QuarkusTest
class BrightcartViewsAndStoriesTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    private static JsonNode entries() {
        return Brightcart.expected("entries");
    }

    /** {@code views generate --plateau <p> -i <every shipped view>}. */
    private Brightcart.Result generateEveryView(Path workspace, String plateau) {
        val arguments = new ArrayList<>(List.of("views", "generate", "--plateau", plateau));
        for (val view : entries().get("views")) {
            arguments.add("-i");
            arguments.add(view.get("id").asText());
        }
        return cli().in(workspace, arguments);
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void everyViewIsDrawnWhereThePlateauHasWhatItNamesAndSkippedWithAWarningWhereItDoesNot(
        String plateau,
        @TempDir Path dir
    ) {
        val workspace = Brightcart.copy(dir);
        val result = generateEveryView(workspace, plateau);
        assertEquals(0, result.exit(), result.err());

        // the warnings, in the order of the ids of the views (the command line draws them in that order), once each
        val views = new ArrayList<JsonNode>();
        entries().get("views").forEach(views::add);
        views.sort((a, b) -> a.get("id").asText().compareTo(b.get("id").asText()));
        val warnings = new ArrayList<String>();
        val drawn = new TreeSet<String>();
        for (val view : views) {
            val there = view.get("plateaus").get(plateau);
            there.get("warnings").forEach(w -> warnings.add("warning: " + w.asText()));
            if (there.get("drawn").asBoolean()) {
                drawn.add(there.get("file").asText());
            } else {
                assertNull(there.get("file").textValue(), view.get("id").asText());
            }
        }
        assertEquals(
            warnings,
            result
                .err()
                .lines()
                .filter(l -> !l.isBlank())
                .toList(),
            plateau + ": the warnings"
        );

        // the files: the views named, drawn, and nothing else (a view saved is not a built-in view)
        val folder = workspace.getParent().resolve("views-" + plateau);
        val written = new TreeSet<>(Brightcart.tree(folder).keySet());
        assertEquals(drawn, written, plateau + ": the views drawn");
        assertEquals(drawn.size(), Brightcart.puml(folder), plateau);
    }

    /** What a saved map draws: the boxes it opens and what it hides, in the plateaus that can draw it. */
    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void theSavedMapsAreDrawnWithWhatTheyOpenHideAndPin(String plateau, @TempDir Path dir) {
        val workspace = Brightcart.copy(dir);
        val result = generateEveryView(workspace, plateau);
        assertEquals(0, result.exit(), result.err());
        val folder = workspace
            .getParent()
            .resolve("views-" + plateau)
            .resolve("plantuml");

        // the environments, production opened, the sandboxes and staging hidden: in the four plateaus
        val environments = read(folder.resolve("technology/environments_map.puml"));
        assertTrue(environments.contains("Production"), plateau);
        assertTrue(environments.contains("Partners (live)"), plateau);
        assertFalse(environments.contains("Partners (sandbox)"), plateau + ": the sandboxes are hidden");
        assertFalse(environments.contains("Staging"), plateau + ": staging is hidden");

        // the cloud region: pinned on the cluster, only where there is one
        val cloud = folder.resolve("technology/cloud_map.puml");
        val cloudHere = entries().get("views").get(indexOf("cloud_map")).get("plateaus").get(plateau);
        assertEquals(cloudHere.get("drawn").asBoolean(), Files.exists(cloud), plateau);
        if (Files.exists(cloud)) {
            assertTrue(read(cloud).contains("Kubernetes cluster"), plateau);
        }

        // the application map: two elements pinned; the shop is opened where there is one
        val applications = read(folder.resolve("application/applications_map.puml"));
        assertTrue(applications.contains("Shopper"), plateau);
        assertTrue(applications.contains("Payment provider"), plateau);
        // `shop` is opened, so its containers are drawn, in the plateaus that have it; `marketplace` leaves the entry out and draws `storefront` folded
        val hasShop = !entries()
            .get("views")
            .get(indexOf("applications_map"))
            .get("plateaus")
            .get(plateau)
            .get("leftOut")
            .toString()
            .contains("shop");
        assertEquals(
            hasShop,
            applications.contains("Web storefront"),
            plateau + ": the shop is opened where there is one"
        );
    }

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void everyPlateauLoadsWithTheViewsAndTheStoriesAndListsTheViewsAsASavedViewOfNoPlateau(
        String plateau,
        @TempDir Path dir
    ) {
        // the plateau-free check, the steps of the stories (`at` and `against` name plateaus of the workspace) and the layers are all in the load
        val workspace = Brightcart.copy(dir).toAbsolutePath();
        val listing = cli().in(workspace, List.of("query", "views", "--plateau", plateau), "-f", "json");
        assertEquals(0, listing.exit(), listing.err());
        assertEquals("", listing.err());
        val listed = new TreeSet<String>();
        readTree(listing.out()).forEach(v -> listed.add(v.get("id").asText()));
        for (val view : entries().get("views")) {
            assertTrue(listed.contains(view.get("id").asText()), plateau + " lists " + view.get("id").asText());
        }
        val list = cli().in(workspace, List.of("plateau", "list"));
        assertEquals(0, list.exit(), list.err());
        assertEquals("", list.err());
    }

    /** The folder of the views and the stories is the one no plateau owns: no header of a file in it says a plateau. */
    @Test
    void noViewAndNoStoryOfTheFixtureSaysAPlateau() {
        val folder = Brightcart.LAYERED.resolve(entries().get("folder").asText());
        val files = Brightcart.tree(folder);
        assertEquals(entries().get("views").size() + entries().get("stories").size(), files.size());
        files.forEach((name, text) -> {
            assertFalse(text.lines().anyMatch(l -> l.trim().startsWith("plateau:")), name);
            assertTrue(
                text.contains("kind: \"archicode.morin.io/view\"") ||
                    text.contains("kind: \"archicode.morin.io/story\""),
                name
            );
        });
    }

    /** A story is checked, not drawn, by the command line: a step that names a plateau that is none is one sentence. */
    @Test
    void aStepOfAShippedStoryThatNamesAPlateauThatIsNoneIsOneSentenceWithTheStoryTheFileAndTheNumber(@TempDir Path dir)
        throws Exception {
        val workspace = Brightcart.copy(dir);
        val story = dir.resolve(entries().get("folder").asText()).resolve("story.fork_tour.yaml");
        Files.writeString(story, Files.readString(story).replace("at: \"saas\"", "at: \"sass\""));
        val result = cli().in(workspace, List.of("diff", "--plateau", "baseline"));
        assertEquals(1, result.exit());
        assertEquals(
            List.of(
                "error: the story `fork_tour` (`shared/story.fork_tour.yaml`) step 2 says `at: sass`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`, `saas`)"
            ),
            result
                .err()
                .lines()
                .filter(l -> !l.isBlank())
                .toList()
        );
    }

    private static int indexOf(String viewId) {
        val views = entries().get("views");
        for (int i = 0; i < views.size(); i++) {
            if (views.get(i).get("id").asText().equals(viewId)) {
                return i;
            }
        }
        throw new IllegalArgumentException(viewId);
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    @SneakyThrows
    private static JsonNode readTree(String json) {
        return Brightcart.MAPPER.readTree(json);
    }
}

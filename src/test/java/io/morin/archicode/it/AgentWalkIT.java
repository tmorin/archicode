package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.notEmpty;
import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.doc.GuideBlocks;
import io.quarkus.test.junit.main.LaunchResult;
import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The walk of an agent that is given the binary and nothing else (wave 022, run 0161, V6(a), issue #144, "tested the way an agent
 * uses it"): from an empty folder, using only what the packaged application prints, the jar under the JVM and the native runner
 * under {@code -Dnative}.
 *
 * <ol>
 *   <li>{@code guide}: the commands to start with are read from the guide (its {@code sh} block), and so are the manifests to
 *       add (its {@code yaml} blocks); this test names no command line or file content that the guide does not give.</li>
 *   <li>{@code init}, then the files of the guide that {@code init} did not write: a container in a manifest of its own, an
 *       environment with a node, a Map of each layer with {@code pinned}, {@code opened} and {@code relationships: false}.</li>
 *   <li>{@code query graph} holds the new elements, {@code views generate} (and {@code -i}) draws them.</li>
 *   <li>Three mistakes (a dangling reference, an unknown key, a dotted id): one {@code error:} line, exit 1, that says what to
 *       write; the repair gives a workspace that loads.</li>
 *   <li>A plateau with a patch and a new element: {@code plateau list}, {@code diff}, {@code --plateau}, {@code diff --fail-on}
 *       (exit 3 for what it holds, 0 for what it does not).</li>
 * </ol>
 *
 * Where this walk needed a fact the tools did not print, the guide was changed (see the run document): the plateau patch of the
 * guide targeted an element that {@code init} does not write.
 */
@QuarkusMainIntegrationTest
class AgentWalkIT {

    private static final ObjectMapper JSON = new ObjectMapper();

    @TempDir
    Path dir;

    /** The commands of the {@code sh} blocks of the guide ({@code archicode <arguments>}), in order. */
    private static List<List<String>> startingCommands(String guide) {
        val out = new ArrayList<List<String>>();
        for (val block : GuideBlocks.blocks(guide)) {
            if (!"sh".equals(block.language())) {
                continue;
            }
            for (val line : block.text().split("\n")) {
                if (line.startsWith("archicode ")) {
                    val command = line.contains("#") ? line.substring(0, line.indexOf('#')) : line;
                    val words = command.strip().split("\\s+");
                    out.add(List.of(words).subList(1, words.length));
                }
            }
        }
        return out;
    }

    private static LaunchResult run(QuarkusMainLauncher launcher, Path folder, String... arguments) {
        val all = new ArrayList<String>(List.of("-w", workspace(folder)));
        all.addAll(List.of(arguments));
        return launcher.launch(all.toArray(String[]::new));
    }

    @SneakyThrows
    private static Set<String> references(String graph) {
        val out = new TreeSet<String>();
        JSON.readTree(graph)
            .get("elements")
            .forEach(e -> out.add(e.get("reference").asText()));
        return out;
    }

    /** The one {@code error:} line of a run that failed with exit code 1. */
    private static String oneError(LaunchResult result) {
        assertEquals(1, result.exitCode(), () -> said(result));
        val error = result.getErrorOutput().strip();
        assertTrue(error.startsWith("error: "), () -> said(result));
        assertEquals(1, error.lines().count(), () -> said(result));
        assertFalse(error.contains("\tat "), () -> said(result));
        return error;
    }

    private static void line(String pattern, String text) {
        assertTrue(
            Pattern.compile(pattern, Pattern.MULTILINE).matcher(text).find(),
            () -> "no line matches /" + pattern + "/\n" + text
        );
    }

    @SneakyThrows
    private static void write(Path folder, String file, String text) {
        val target = folder.resolve(file);
        Files.createDirectories(target.getParent());
        Files.writeString(target, text);
    }

    @Test
    @SneakyThrows
    void anAgentGoesFromAnEmptyFolderToADrawnWorkspaceWithAPlateauUsingOnlyWhatTheToolsPrint(
        QuarkusMainLauncher launcher
    ) {
        // 1. The guide: where to start, and the files to add.
        val guideRun = succeeded(launcher.launch("guide"));
        val guide = payload(guideRun);
        val files = GuideBlocks.files(guide);
        val start = startingCommands(guide);
        assertEquals(List.of("init"), start.get(0).subList(0, 1), () -> "the guide starts with init: " + start);
        assertTrue(start.stream().anyMatch(c -> c.subList(0, 2).equals(List.of("query", "graph"))), start::toString);

        // 2. init, in a folder that does not exist yet, as the guide's first command says.
        val folder = dir.resolve("my-architecture");
        val init = succeeded(launcher.launch("init", folder.toString()));
        assertTrue(payload(init).contains("archicode query graph"), () -> said(init));
        notEmpty(folder.resolve(".archicode.yaml"));

        // 3. The guide's other commands that start from nothing, run as the guide writes them (with -w, instead of cd).
        for (val command : start.subList(1, start.size())) {
            val arguments = command.toArray(String[]::new);
            val result = run(launcher, folder, arguments);
            assertEquals(0, result.exitCode(), () -> String.join(" ", command) + "\n" + said(result));
        }
        notEmpty(folder.resolve("views/plantuml/application/shop_overview.puml"));
        val first = references(payload(succeeded(run(launcher, folder, "query", "graph"))));
        assertEquals(new TreeSet<>(List.of("customer", "shop", "shop.web")), first);

        // 4. New elements, from the examples of the guide: the files that init did not write.
        for (val name : List.of(
            "manifests/shop.search.yaml",
            "manifests/prod.yaml",
            "manifests/view.apps_map.yaml",
            "manifests/view.prod_map.yaml"
        )) {
            assertTrue(files.containsKey(name), () -> "the guide gives no " + name + ": " + files.keySet());
            write(folder, name, files.get(name));
        }
        val graph = payload(succeeded(run(launcher, folder, "query", "graph")));
        val elements = references(graph);
        for (val reference : List.of("shop.search", "prod", "prod.vm", "prod.db")) {
            assertTrue(elements.contains(reference), () -> reference + " is not in the graph: " + elements);
        }
        assertTrue(graph.contains("\"destination\":\"prod.db\""), () -> graph);

        // 5. Drawn: every element, then the two Maps by their ids.
        succeeded(run(launcher, folder, "views", "generate"));
        notEmpty(folder.resolve("views/plantuml/application/shop_search-overview.puml"));
        val maps = succeeded(run(launcher, folder, "views", "generate", "-i", "apps_map", "-i", "prod_map"));
        assertEquals("", maps.getErrorOutput().strip(), () -> said(maps));
        val appsMap = folder.resolve("views/plantuml/application/apps_map.puml");
        notEmpty(appsMap);
        notEmpty(folder.resolve("views/plantuml/technology/prod_map.puml"));
        assertTrue(Files.readString(appsMap).contains("Web site"), "the pinned container is drawn");

        // 6. Mistakes: the line says what is wrong and what to write; the repair loads.
        val search = folder.resolve("manifests/shop.search.yaml");
        val good = Files.readString(search);

        write(folder, "manifests/shop.search.yaml", good + "  relationships:\n    - destination: \"shop.nowhere\"\n");
        val dangling = oneError(run(launcher, folder, "query", "graph"));
        assertTrue(
            dangling.contains("`shop.nowhere`, which does not exist") &&
                dangling.contains("manifests/shop.search.yaml") &&
                dangling.contains("`relationships[0].destination`"),
            dangling
        );
        assertTrue(
            guide.contains("which does not exist, in `manifests/shop.search.yaml` at"),
            "the guide says that sentence"
        );

        write(folder, "manifests/shop.search.yaml", good + "  colour: \"red\"\n");
        val unknown = oneError(run(launcher, folder, "query", "graph"));
        assertTrue(unknown.contains("manifests/shop.search.yaml") && unknown.contains("unknown key `colour`"), unknown);
        assertTrue(unknown.contains("(known: "), unknown);

        write(folder, "manifests/shop.search.yaml", good.replace("id: \"search\"", "id: \"shop.search\""));
        val dotted = oneError(run(launcher, folder, "query", "graph"));
        assertTrue(dotted.contains("contains a dot") && dotted.contains("`content.id`"), dotted);

        write(folder, "manifests/shop.search.yaml", good);
        assertTrue(references(payload(succeeded(run(launcher, folder, "query", "graph")))).contains("shop.search"));

        // 7. A plateau with a patch and an element of its own.
        for (val name : List.of("manifests/plateau.to-be.yaml", "manifests/shop.payments.yaml")) {
            assertTrue(files.containsKey(name), () -> "the guide gives no " + name);
            write(folder, name, files.get(name));
        }
        val plateaus = payload(succeeded(run(launcher, folder, "plateau", "list")));
        line("^baseline\\s+-\\s+implicit", plateaus);
        line("^to-be\\s+baseline\\s+manifest manifests/plateau.to-be.yaml", plateaus);

        val base = references(payload(succeeded(run(launcher, folder, "query", "graph", "--plateau", "baseline"))));
        val toBeGraph = payload(succeeded(run(launcher, folder, "query", "graph", "--plateau", "to-be")));
        val toBe = references(toBeGraph);
        assertFalse(base.contains("shop.payments"), base.toString());
        assertTrue(toBe.contains("shop.payments"), toBe.toString());

        val diff = payload(succeeded(run(launcher, folder, "diff")));
        assertTrue(diff.contains("shop.payments") && diff.contains("shop.web"), diff);
        line("shop\\.payments.*new|new.*shop\\.payments", diff);
        line("shop\\.web.*changed|changed.*shop\\.web", diff);

        assertTrue(toBeGraph.contains("\"destination\":\"shop.payments\""), "the ADD patch adds the relationship");
        val root = oneError(run(launcher, folder, "diff", "--plateau", "baseline"));
        assertTrue(root.contains("--against"), root);

        val gate = run(launcher, folder, "diff", "--fail-on", "new,removed");
        assertEquals(3, gate.exitCode(), () -> said(gate));
        val clean = run(launcher, folder, "diff", "--fail-on", "removed");
        assertEquals(0, clean.exitCode(), () -> said(clean));

        succeeded(run(launcher, folder, "views", "generate", "--plateau", "to-be"));
        notEmpty(folder.resolve("views-to-be/plantuml/application/shop_payments-overview.puml"));
        val nowhere = oneError(run(launcher, folder, "views", "generate", "--plateau", "nowhere"));
        assertTrue(nowhere.contains("nowhere"), nowhere);

        // 8. The stories of the guide are drawn too.
        write(folder, "manifests/story.tour.yaml", files.get("manifests/story.tour.yaml"));
        succeeded(run(launcher, folder, "stories", "generate"));
        assertTrue(Files.isDirectory(folder.resolve("views-stories/tour")), "the story is drawn");
    }
}

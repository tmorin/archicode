package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The before and after of {@code plateau fold inhouse} on the layered Brightcart (wave 028, run 0208, #65, DEC-9): the
 * files the author's tools write for the plateaus that remain are the same, but for the PLATEAU and PATCH columns of the
 * cascade of the removals, and a second fold is refused because the plateau no longer exists.
 */
@QuarkusTest
class PlateauFoldBeforeAfterTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/fold-cases.json");
    private static final List<String> REMAINING = List.of("baseline", "marketplace", "saas");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @Test
    @SneakyThrows
    void shouldReadTheSameBeforeAndAfterTheFoldButForThePlateauAndPatchColumns() {
        val work = dir.resolve("brightcart");
        copy(Path.of("src/test/resources/brightcart/layered"), work);
        // the two stories that name inhouse are replaced, as case F07 does: a fold never rewrites a step
        val f07 = new ObjectMapper().readTree(CASES.toFile()).get("cases").get(6);
        assertEquals("F07", f07.get("id").asText());
        for (val name : (Iterable<String>) f07.get("files")::fieldNames) {
            Files.writeString(work.resolve(name), f07.get("files").get(name).asText());
        }

        val before = capture(work);
        assertTrue(before.get("plateau list").contains("inhouse"));
        // 6 ordered pairs of the three plateaus, 3 graphs, 3 view folders and the comparison of marketplace
        assertEquals(
            6,
            before
                .keySet()
                .stream()
                .filter(k -> k.startsWith("diff "))
                .count()
        );

        try (val walk = Files.list(work)) {
            for (val p : (Iterable<Path>) walk.filter(p -> p.getFileName().toString().startsWith("views-"))::iterator) {
                deleteTree(p);
            }
        }
        val fold = run(work, "plateau", "fold", "inhouse");
        assertEquals(0, fold.exit(), fold.err());
        assertTrue(fold.out().startsWith("plateau fold inhouse into marketplace (written)"), fold.out());
        val after = capture(work);

        assertEquals(before.keySet(), after.keySet(), "the same commands and the same files");
        int identical = 0;
        int normalised = 0;
        val differing = new ArrayList<String>();
        for (val key : before.keySet()) {
            val b = before.get(key);
            val a = after.get(key);
            if ("plateau list".equals(key)) {
                // inhouse is gone, marketplace stands on baseline now, every other row is as it was
                assertEquals(
                    rowsOf(b)
                        .stream()
                        .filter(r -> !r.startsWith("inhouse"))
                        .map(r -> r.replace("marketplace inhouse ", "marketplace baseline "))
                        .toList(),
                    rowsOf(a)
                );
                continue;
            }
            if (b.equals(a)) {
                identical++;
            } else {
                assertEquals(
                    normalise(key, b),
                    normalise(key, a),
                    key + " differs beyond the PLATEAU and PATCH columns"
                );
                normalised++;
                differing.add(key);
            }
        }
        assertTrue(
            normalised > 0 && identical > normalised,
            "most outputs are identical and the cascades are the ones that differ"
        );
        System.out.println(
            "before-after: " +
                before.size() +
                " outputs, " +
                identical +
                " identical, " +
                normalised +
                " equal but for PLATEAU and PATCH " +
                differing
        );

        val list = run(work, "plateau", "list").out();
        assertFalse(list.contains("inhouse"), list);
        assertTrue(Files.notExists(work.resolve("inhouse/plateau.yaml")));

        val second = run(work, "plateau", "fold", "inhouse");
        assertEquals(1, second.exit());
        assertEquals(
            "error: unknown plateau `inhouse`: the plateaus of this workspace are `baseline`, `marketplace` and `saas`\n",
            second.err()
        );
        assertEquals("", second.out());
    }

    /** The output of every command the oracle runs, by label; the files views generate writes are keyed by their path. */
    private Map<String, String> capture(Path work) {
        val out = new TreeMap<String, String>();
        out.put("plateau list", ok(run(work, "plateau", "list")));
        for (val p : REMAINING) {
            for (val q : REMAINING) {
                if (!p.equals(q)) {
                    out.put(
                        "diff " + p + " against " + q,
                        ok(run(work, "diff", "--plateau", p, "--against", q, "-f", "json"))
                    );
                }
            }
            out.put("graph " + p, ok(run(work, "query", "graph", "--plateau", p)));
            // marketplace is compared with the plateau it overrides by default, which the fold changes: name it
            ok(
                "marketplace".equals(p)
                    ? run(work, "views", "generate", "--plateau", p, "--against", "baseline")
                    : run(work, "views", "generate", "--plateau", p)
            );
        }
        for (val e : files(work).entrySet()) {
            if (e.getKey().startsWith("views-")) {
                out.put("file " + e.getKey(), e.getValue());
            }
        }
        return out;
    }

    private static String ok(CliHarness.Result r) {
        assertEquals(0, r.exit(), r.err());
        return r.out();
    }

    private CliHarness.Result run(Path work, String... args) {
        val all = new ArrayList<String>(List.of("-w", work.resolve(".archicode.yaml").toString()));
        all.addAll(List.of(args));
        return CliHarness.run(factory, errorOutput, all.toArray(String[]::new));
    }

    /** The rows of {@code plateau list} that describe a plateau, by id, with the parent. */
    private static List<String> rowsOf(String list) {
        return list
            .lines()
            .map(l -> l.strip().replaceAll(" +", " "))
            .filter(l -> !l.isEmpty())
            .toList();
    }

    /** The text of a result with the PLATEAU and PATCH columns of the cascade of the removals left out. */
    @SneakyThrows
    private static String normalise(String key, String text) {
        if (key.endsWith("gap.json") || key.startsWith("diff ")) {
            val root = (ObjectNode) new ObjectMapper().readTree(text);
            if (root.has("cascade")) {
                for (JsonNode row : root.get("cascade")) {
                    ((ObjectNode) row).remove(List.of("plateau", "rank"));
                }
                // the patch text stays in the row: it is the rank that moves, not the patch
            }
            return root.toPrettyString();
        }
        if (key.endsWith("gap.md")) {
            val inCascade = new boolean[1];
            return text
                .lines()
                .map(line -> {
                    if (line.startsWith("## Cascade")) {
                        inCascade[0] = true;
                    }
                    if (inCascade[0] && line.startsWith("| ") && !line.startsWith("| Plateau")) {
                        val cells = line.split(" \\| ", 4);
                        return cells.length == 4 ? "| | | " + cells[3] : line;
                    }
                    return line;
                })
                .collect(Collectors.joining("\n"));
        }
        if (key.startsWith("graph ")) {
            // the one difference of the model, by design (DEC-3): the entry that named an element of inhouse names, after
            // the fold, the element of baseline it replaced. The test counts it, then reads both graphs the same way.
            val tree = new ObjectMapper().readTree(text);
            composeKnownReplaces(tree);
            return sortedChildren(tree).toPrettyString();
        }
        return text;
    }

    private static final List<String> COMPOSED_FROM = List.of("commerce.search");
    private static final List<String> COMPOSED_TO = List.of("shop.app.search");

    /** The entry {@code replaces: [commerce.search]} (before the fold) as the fold writes it, {@code [shop.app.search]}. */
    private static void composeKnownReplaces(JsonNode node) {
        if (node.isObject()) {
            val replaces = node.get("replaces");
            if (replaces != null && replaces.isArray() && replaces.size() == 1) {
                val value = List.of(replaces.get(0).asText());
                if (COMPOSED_FROM.equals(value) || COMPOSED_TO.equals(value)) {
                    val array = ((ObjectNode) node).putArray("replaces");
                    COMPOSED_TO.forEach(array::add);
                }
            }
            node.forEach(PlateauFoldBeforeAfterTest::composeKnownReplaces);
        } else if (node.isArray()) {
            node.forEach(PlateauFoldBeforeAfterTest::composeKnownReplaces);
        }
    }

    /** The graph with the nested {@code elements} of every element in the order of their ids: the query sorts only the top. */
    private static JsonNode sortedChildren(JsonNode node) {
        if (node.isObject()) {
            node.properties().forEach(e -> sortedChildren(e.getValue()));
            if (node.has("elements") && node.get("elements").isArray() && node.has("id")) {
                val children = new ArrayList<JsonNode>();
                node.get("elements").forEach(children::add);
                children.sort(Comparator.comparing(c -> c.path("id").asText()));
                ((ObjectNode) node).set("elements", new ObjectMapper().createArrayNode().addAll(children));
            }
        } else if (node.isArray()) {
            node.forEach(PlateauFoldBeforeAfterTest::sortedChildren);
        }
        return node;
    }

    @SneakyThrows
    private static Map<String, String> files(Path root) {
        val out = new TreeMap<String, String>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (val p : (Iterable<Path>) walk.filter(Files::isRegularFile)::iterator) {
                out.put(root.relativize(p).toString().replace('\\', '/'), Files.readString(p));
            }
        }
        return out;
    }

    @SneakyThrows
    private static void deleteTree(Path p) {
        try (Stream<Path> walk = Files.walk(p)) {
            for (val f : (Iterable<Path>) walk.sorted(Comparator.reverseOrder())::iterator) {
                Files.delete(f);
            }
        }
    }

    @SneakyThrows
    private static void copy(Path from, Path to) {
        try (val walk = Files.walk(from)) {
            for (val source : (Iterable<Path>) walk::iterator) {
                val target = to.resolve(from.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
    }
}

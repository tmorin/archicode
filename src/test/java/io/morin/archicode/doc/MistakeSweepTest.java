package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * V-A of wave 023 (run 0164, T8): no mistake of the author in one key of a manifest ends in a stack trace.
 *
 * <p>Each workspace the repository ships is copied to a scratch folder; then, one manifest at a time, one key is removed, a
 * list or a map is emptied, or a key is set to {@code null} (in the header and in the content, down to {@link #DEPTH}
 * levels), the mutated manifest is written, and the workspace is read by {@code query graph} and {@code views generate}
 * (and by {@code views generate -i} for a view, {@code stories generate} for a story). The verdict of a command is a
 * success, or {@code error:} lines with exit code 1 and nothing else. A stack trace, {@code unexpected} or another exit code
 * fails, except the mistakes listed in {@code known-traces.json} (each with the issue that tracks it: a mistake whose fix is
 * for the author to decide).
 *
 * <p>The commands run in this process, as the other tests of the command line do; the figures printed at the end say what
 * was swept.
 */
@QuarkusTest
class MistakeSweepTest {

    /** How many levels of keys under the header and the content are mutated (1: the keys of the header and the content). */
    private static final int DEPTH = 3;

    private static final int PER_KIND = 1;

    private static final Path KNOWN = Path.of("src/test/resources/known-traces.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path scratch;

    record Verdict(int exit, String err) {
        /** Whether this is a success or an author error told as lines, which is all a command may say. */
        boolean clean() {
            if (exit != 0 && exit != 1) {
                return false;
            }
            for (val line : err.lines().toList()) {
                if (line.startsWith("warning: ")) {
                    continue;
                }
                if (exit == 1 && line.startsWith("error: ") && !line.startsWith("error: unexpected ")) {
                    continue;
                }
                return false;
            }
            return exit == 0 || err.contains("error: ");
        }
    }

    private Verdict run(Path workspace, String... args) {
        val all = new ArrayList<String>(List.of("--workspace", workspace.toString()));
        all.addAll(List.of(args));
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previous = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(io.morin.archicode.cli.ArchiCode.class, factory);
            commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
            errorOutput.install(commandLine);
            val exit = commandLine.execute(all.toArray(String[]::new));
            return new Verdict(exit, err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previous);
        }
    }

    /** One mutation: where it is, and the document after it. */
    record Mutation(String path, String kind, JsonNode document) {}

    static List<Mutation> mutationsOf(JsonNode original) {
        val out = new ArrayList<Mutation>();
        for (val part : List.of("header", "content")) {
            if (original.path(part).isContainerNode()) {
                visit(original, original.path(part), part, 1, out);
            }
        }
        return out;
    }

    private static void visit(JsonNode root, JsonNode node, String path, int level, List<Mutation> out) {
        if (node.isObject()) {
            val names = new ArrayList<String>();
            node.fieldNames().forEachRemaining(names::add);
            for (val name : names) {
                out.add(new Mutation(path + "." + name, "removed", edit(root, path + "." + name, Edit.REMOVE)));
                out.add(new Mutation(path + "." + name, "null", edit(root, path + "." + name, Edit.NULL)));
                if (node.get(name).isContainerNode() && !node.get(name).isEmpty()) {
                    out.add(new Mutation(path + "." + name, "emptied", edit(root, path + "." + name, Edit.EMPTY)));
                }
                if (level < DEPTH && node.get(name).isContainerNode()) {
                    visit(root, node.get(name), path + "." + name, level + 1, out);
                }
            }
        } else if (node.isArray()) {
            // the first item stands for the others: the sweep is of kinds of mistakes, not of every item
            if (!node.isEmpty() && level < DEPTH && node.get(0).isContainerNode()) {
                visit(root, node.get(0), path + "[0]", level + 1, out);
            }
            if (!node.isEmpty() && node.get(0).isValueNode()) {
                out.add(new Mutation(path + "[0]", "null", edit(root, path + "[0]", Edit.NULL)));
            }
        }
    }

    private enum Edit {
        REMOVE,
        NULL,
        EMPTY
    }

    /** A copy of the document with the node at the path edited. */
    private static JsonNode edit(JsonNode root, String path, Edit edit) {
        val copy = root.deepCopy();
        JsonNode parent = copy;
        val steps = path.split("\\.");
        String last = null;
        for (int i = 0; i < steps.length; i++) {
            var step = steps[i];
            var index = -1;
            val bracket = step.indexOf('[');
            if (bracket >= 0) {
                index = Integer.parseInt(step.substring(bracket + 1, step.length() - 1));
                step = step.substring(0, bracket);
            }
            if (i == steps.length - 1) {
                last = step;
                if (index >= 0) {
                    ((ArrayNode) parent.get(step)).set(index, NullNode.getInstance());
                    return copy;
                }
                break;
            }
            parent = parent.get(step);
            if (index >= 0) {
                parent = parent.get(index);
            }
        }
        val object = (ObjectNode) parent;
        switch (edit) {
            case REMOVE -> object.remove(last);
            case NULL -> object.set(last, NullNode.getInstance());
            case EMPTY -> object.set(last, object.get(last).isArray() ? object.arrayNode() : object.objectNode());
        }
        return copy;
    }

    @SneakyThrows
    private static void copyTree(Path from, Path to) {
        try (Stream<Path> files = Files.walk(from)) {
            for (val file : files.toList()) {
                val target = to.resolve(from.relativize(file).toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(file, target);
                }
            }
        }
    }

    /**
     * The manifests of a workspace that are swept: all of them with {@code -Darchicode.sweep.all=true} (8,611 mutated
     * workspaces, about eight minutes, swept once by the run that wrote this test and by anyone who changes a loader), else
     * the {@link #PER_KIND} richest of each kind (the most keys), which is every shape of manifest the repository ships.
     */
    private static List<ManifestCorpus.Entry> chosen(List<ManifestCorpus.Entry> all) {
        if (Boolean.getBoolean("archicode.sweep.all")) {
            return all;
        }
        val byKind = new java.util.TreeMap<String, List<ManifestCorpus.Entry>>();
        for (val entry : all) {
            byKind
                .computeIfAbsent(entry.document().path("header").path("kind").asText(), k -> new ArrayList<>())
                .add(entry);
        }
        val out = new ArrayList<ManifestCorpus.Entry>();
        for (val entries : byKind.values()) {
            entries.sort(
                java.util.Comparator.comparingInt(
                    (ManifestCorpus.Entry e) -> -e.document().toString().length()
                ).thenComparing(ManifestCorpus.Entry::file)
            );
            out.addAll(entries.subList(0, Math.min(PER_KIND, entries.size())));
        }
        return out;
    }

    @SneakyThrows
    private static Set<String> known() {
        val out = new TreeSet<String>();
        for (val entry : new ObjectMapper().readTree(KNOWN.toFile()).path("traces")) {
            out.add(entry.path("case").asText());
        }
        return out;
    }

    @Test
    @SneakyThrows
    void shouldEndEveryOneKeyMistakeInSuccessOrAnErrorLine() {
        // the test profile logs every rendered item at DEBUG, which is most of the time of 8,000 reads
        val logger = java.util.logging.Logger.getLogger("io.morin.archicode");
        val level = logger.getLevel();
        logger.setLevel(java.util.logging.Level.OFF);
        try {
            sweep();
        } finally {
            logger.setLevel(level);
        }
    }

    @SneakyThrows
    private void sweep() {
        val started = System.nanoTime();
        val known = known();
        val stillFailing = new TreeSet<String>();
        val failures = new LinkedHashMap<String, String>();
        var swept = 0;
        var ran = 0;
        val only = System.getProperty("archicode.sweep.only", "");
        for (val shipped : ShippedFilesTest.workspaces()) {
            if (!shipped.contains(only)) {
                continue; // a developer's way to sweep one workspace; the build sweeps them all
            }
            val source = Path.of(shipped).getParent();
            val copy = scratch.resolve(String.valueOf(swept));
            Files.createDirectories(copy);
            copyTree(source, copy);
            val workspace = copy.resolve(".archicode.yaml");
            for (val entry : chosen(ManifestCorpus.manifestsUnder(source, shipped))) {
                val file = copy.resolve(entry.file());
                val name = file.getFileName().toString();
                if (!(name.endsWith(".yaml") || name.endsWith(".yml") || name.endsWith(".json"))) {
                    continue; // only the formats the page writes back as they are read
                }
                val mapper = ManifestCorpus.mapperOf(file);
                val original = Files.readString(file);
                val kind = entry.document().path("header").path("kind").asText();
                val id = entry.document().path("content").path("id").asText("");
                try {
                    for (val mutation : mutationsOf(entry.document())) {
                        Files.writeString(file, mapper.writeValueAsString(mutation.document()));
                        val label = shipped + " " + entry.file() + " " + mutation.path() + " " + mutation.kind();
                        val verdicts = new ArrayList<Verdict>();
                        verdicts.add(run(workspace, "query", "graph"));
                        verdicts.add(run(workspace, "views", "generate"));
                        if (kind.endsWith("/view") && !id.isBlank()) {
                            verdicts.add(run(workspace, "views", "generate", "-i", id));
                        }
                        if (kind.endsWith("/story")) {
                            verdicts.add(run(workspace, "stories", "generate"));
                        }
                        ran++;
                        if (ran % 200 == 0) {
                            System.err.println("MistakeSweepTest: " + ran + " at " + shipped + " " + entry.file());
                        }
                        for (val verdict : verdicts) {
                            if (!verdict.clean()) {
                                if (known.contains(label)) {
                                    stillFailing.add(label);
                                } else {
                                    failures.putIfAbsent(label, firstLines(verdict));
                                }
                            }
                        }
                    }
                } finally {
                    Files.writeString(file, original);
                }
            }
            swept++;
        }
        System.out.println(
            "MistakeSweepTest: " +
                swept +
                " workspaces, " +
                ran +
                " mutated workspaces read in " +
                (System.nanoTime() - started) / 1_000_000_000 +
                " s"
        );
        val unused = new TreeSet<>(known);
        unused.removeAll(stillFailing);
        assertTrue(failures.isEmpty(), "a mistake ends in a stack trace or a bad exit code:\n" + describe(failures));
        assertTrue(unused.isEmpty(), "known-traces.json lists a case that no longer fails (delete it): " + unused);
    }

    private static String firstLines(Verdict verdict) {
        return (
            "exit " +
            verdict.exit() +
            ": " +
            verdict
                .err()
                .lines()
                .limit(3)
                .reduce((a, b) -> a + " | " + b)
                .orElse("")
        );
    }

    private static String describe(Map<String, String> failures) {
        val out = new StringBuilder();
        failures.forEach((k, v) -> out.append(k).append(" -> ").append(v).append('\n'));
        return out.toString();
    }
}

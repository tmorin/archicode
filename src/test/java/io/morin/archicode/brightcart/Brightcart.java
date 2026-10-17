package io.morin.archicode.brightcart;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.cli.ArchiCode;
import io.morin.archicode.cli.ErrorOutput;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import picocli.CommandLine;

/**
 * Brightcart (wave 012), as the tests of this package read it: the files of
 * {@code src/test/resources/brightcart/} that {@code generate.mjs} wrote, never the generator (no test runs node). The
 * complete-folder rendition {@code folders/} is the workspace; {@code expected/} holds the answers the document records
 * (sizes, the comparisons P1 to P6 with the command that gives each, the table of changes, the notable cases N1 to
 * N17). A test asserts the tool against those files and types no number of its own.
 *
 * <p>The command line is run in the process, through the real picocli command line, on a <strong>copy</strong> of
 * {@code folders/} in a temporary folder: {@code views generate} writes {@code views-*} folders next to
 * {@code workspace.yaml}, and the repository is never written.
 */
final class Brightcart {

    static final Path ROOT = Path.of("src/test/resources/brightcart");
    static final Path FOLDERS = ROOT.resolve("folders");
    static final ObjectMapper MAPPER = new ObjectMapper();

    /** The four plateaus, in the order of {@code settings.plateaus}. */
    static final List<String> PLATEAUS = List.of("baseline", "saas", "inhouse", "marketplace");

    /** The three facets of the workspace of section 4 of the document. */
    static final List<String> FACETS = List.of("journey", "no-externals", "without-cart");

    private Brightcart() {}

    record Result(int exit, String out, String err) {}

    private static final Map<String, JsonNode> EXPECTED = new TreeMap<>();

    /** A file of {@code expected/}, read once. */
    @SneakyThrows
    static synchronized JsonNode expected(String name) {
        val known = EXPECTED.get(name);
        if (known != null) {
            return known;
        }
        val read = MAPPER.readTree(Files.readString(ROOT.resolve("expected").resolve(name + ".json")));
        EXPECTED.put(name, read);
        return read;
    }

    /** The comparisons a tool can say today ({@code verified: "archicode diff"}): the others are the model's. */
    static List<JsonNode> verifiedComparisons() {
        val out = new ArrayList<JsonNode>();
        expected("comparisons").forEach(c -> {
            if ("archicode diff".equals(c.get("verified").asText())) {
                out.add(c);
            }
        });
        return out;
    }

    /** The ids of the verified comparisons, for a parameterized test. */
    static Stream<String> verifiedIds() {
        return verifiedComparisons()
            .stream()
            .map(c -> c.get("id").asText());
    }

    static JsonNode comparison(String id) {
        for (val c : expected("comparisons")) {
            if (c.get("id").asText().equals(id)) {
                return c;
            }
        }
        throw new IllegalArgumentException("no comparison " + id);
    }

    /** The arguments after {@code archicode} of the command a comparison records: {@code diff --plateau saas}. */
    static List<String> arguments(JsonNode comparison) {
        val words = Arrays.asList(comparison.get("command").asText().split(" "));
        if (!words.get(0).equals("archicode")) {
            throw new IllegalArgumentException(comparison.get("command").asText());
        }
        return words.subList(1, words.size());
    }

    /** A copy of {@code folders/} into {@code into}; returns its {@code workspace.yaml}. */
    @SneakyThrows
    static Path copyFolders(Path into) {
        try (val files = Files.walk(FOLDERS)) {
            for (val source : files.toList()) {
                val target = into.resolve(FOLDERS.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        return into.resolve("workspace.yaml");
    }

    /** The files below a folder, relative and sorted, with their bytes: a tree to compare. */
    @SneakyThrows
    static Map<String, String> tree(Path folder) {
        val out = new TreeMap<String, String>();
        if (!Files.isDirectory(folder)) {
            return out;
        }
        try (val files = Files.walk(folder)) {
            for (val file : files.filter(Files::isRegularFile).toList()) {
                out.put(folder.relativize(file).toString().replace('\\', '/'), Files.readString(file));
            }
        }
        return out;
    }

    /** What differs between two trees, in a line a failure can show; empty when they are the same. */
    static String difference(Map<String, String> one, Map<String, String> two) {
        val only1 = new TreeSet<>(one.keySet());
        only1.removeAll(two.keySet());
        val only2 = new TreeSet<>(two.keySet());
        only2.removeAll(one.keySet());
        val other = new TreeSet<String>();
        one.forEach((file, text) -> {
            if (two.containsKey(file) && !two.get(file).equals(text)) {
                other.add(file);
            }
        });
        return only1.isEmpty() && only2.isEmpty() && other.isEmpty()
            ? ""
            : "only in the first: " + only1 + "; only in the second: " + only2 + "; different bytes: " + other;
    }

    /** The number of PlantUML files below a folder. */
    @SneakyThrows
    static long puml(Path folder) {
        try (val files = Files.walk(folder)) {
            return files.filter(f -> f.toString().endsWith(".puml")).count();
        }
    }

    /** The command line, the way a shell runs it: the error path installed, the two outputs captured. */
    record Cli(CommandLine.IFactory factory, ErrorOutput errorOutput) {
        Result run(String... args) {
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

        /** {@code -w <workspace> <arguments...>}. */
        Result in(Path workspace, List<String> arguments, String... more) {
            val all = new ArrayList<String>(List.of("-w", workspace.toString()));
            all.addAll(arguments);
            all.addAll(List.of(more));
            return run(all.toArray(String[]::new));
        }

        /** {@code archicode diff ...} as a comparison records it, in the format asked for. */
        Result diff(Path workspace, JsonNode comparison, String format) {
            return in(workspace, arguments(comparison), "--format", format);
        }

        Result generate(Path workspace, String plateau) {
            return in(workspace, List.of("views", "generate", "--plateau", plateau));
        }
    }

    /** What {@code views generate} writes for each plateau, in one copy of {@code folders/}. */
    record Generated(Path workspace, Map<String, Result> results) {
        Path views(String folder) {
            return workspace.getParent().resolve(folder);
        }
    }

    /** {@code views generate --plateau <id>} for the four plateaus, one after the other, on a copy in {@code into}. */
    static Generated generateAll(Cli cli, Path into) {
        return generate(cli, into, PLATEAUS);
    }

    /**
     * {@code views generate --plateau <id>} for the given plateaus, one after the other, on a copy in {@code into}: a
     * run takes about twenty seconds per plateau, so a test that needs the files of two runs asks for two plateaus.
     */
    static Generated generate(Cli cli, Path into, List<String> plateaus) {
        val workspace = copyFolders(into);
        val results = new TreeMap<String, Result>();
        for (val plateau : plateaus) {
            results.put(plateau, cli.generate(workspace, plateau));
        }
        return new Generated(workspace, results);
    }

    private static Generated shared;

    /**
     * The first run of {@link #generateAll}, made once for the whole test run (it is the longest thing the package does)
     * and read by the tests that look at what was written. A test that wants a second run makes its own.
     */
    @SneakyThrows
    static synchronized Generated firstRun(Cli cli) {
        if (shared == null) {
            val dir = Files.createTempDirectory("brightcart-views");
            Runtime.getRuntime().addShutdownHook(new Thread(() -> deleteQuietly(dir)));
            shared = generateAll(cli, dir);
        }
        return shared;
    }

    private static void deleteQuietly(Path dir) {
        try (val files = Files.walk(dir)) {
            files.sorted(java.util.Comparator.reverseOrder()).forEach(f -> {
                try {
                    Files.deleteIfExists(f);
                } catch (java.io.IOException ignored) {
                    // a temporary folder that stays is not a failure of the test
                }
            });
        } catch (java.io.IOException ignored) {
            // idem
        }
    }
}

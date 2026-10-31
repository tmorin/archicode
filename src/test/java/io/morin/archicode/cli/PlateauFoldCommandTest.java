package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode plateau fold} through the command (wave 028, run 0207, #65): the cases of {@code fold-cases.json}, with
 * the exit code and the stream, and the proof that the folder is the same, byte for byte and file for file, whatever the
 * outcome.
 */
@QuarkusTest
class PlateauFoldCommandTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/fold-cases.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @TestFactory
    @SneakyThrows
    Stream<DynamicTest> shouldRunEveryCaseOfTheFileAndLeaveTheFolderAsItWas() {
        val cases = new ObjectMapper().readTree(CASES.toFile()).get("cases");
        val tests = new ArrayList<DynamicTest>();
        for (JsonNode c : cases) {
            tests.add(DynamicTest.dynamicTest(c.get("id").asText() + " " + c.get("what").asText(), () -> run(c)));
        }
        return tests.stream();
    }

    @SneakyThrows
    private void run(JsonNode c) {
        val folder = dir.resolve(c.get("id").asText());
        Files.createDirectories(folder);
        if (!c.get("base").isNull()) {
            copy(Path.of("src/test/resources").resolve(c.get("base").asText()), folder);
        }
        val files = c.get("files");
        for (val name : (Iterable<String>) files::fieldNames) {
            val file = folder.resolve(name);
            Files.createDirectories(file.getParent());
            Files.writeString(file, files.get(name).asText());
        }
        val args = new ArrayList<String>();
        args.add("-w");
        args.add(folder.resolve(".archicode.yaml").toString());
        args.add("plateau");
        args.add("fold");
        c.get("args").forEach(a -> args.add(a.asText()));

        val before = snapshot(folder);
        val files0 = contents(folder);
        val result = CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
        val expect = c.get("expect");
        if (expect.has("error")) {
            assertEquals(1, result.exit(), result.err());
            assertEquals(expect.get("error").asText() + "\n", result.err());
            assertEquals("", result.out());
        } else {
            assertEquals(0, result.exit(), result.err());
            if (expect.has("output")) {
                val lines = new ArrayList<String>();
                expect.get("output").forEach(line -> lines.add(line.asText()));
                assertEquals(String.join("\n", lines) + "\n", result.out());
            } else {
                assertTrue(result.out().startsWith("plateau fold "), result.out());
            }
            // the Brightcart says nothing as it is; a small workspace may carry the warning of its own load, never anything else
            result
                .err()
                .lines()
                .forEach(line -> assertTrue(line.startsWith("warning: "), result.err()));
        }
        if (expect.has("error") || args.contains("--dry-run")) {
            assertEquals(before, snapshot(folder), "a refusal and a dry run leave the folder as it was");
        } else if (expect.has("files")) {
            assertFiles(expect.get("files"), folder, files0);
        }
        if (args.contains("--dry-run") && !expect.has("error")) {
            // the same workspace, the same bytes
            assertEquals(result.out(), CliHarness.run(factory, errorOutput, args.toArray(String[]::new)).out());
        }
    }

    /** Every file the case names is as it says, every other file is byte for byte what it was, and none is added. */
    @SneakyThrows
    private static void assertFiles(JsonNode expected, Path folder, Map<String, String> was) {
        val now = contents(folder);
        for (val path : (Iterable<String>) expected::fieldNames) {
            val said = expected.get(path);
            if (said.isNull()) {
                assertFalse(now.containsKey(path), path + " is deleted");
            } else if ("changed".equals(said.asText())) {
                assertTrue(now.containsKey(path), path + " is written");
                assertNotEquals(was.get(path), now.get(path), path + " changed");
            } else {
                assertEquals(said.asText(), now.get(path), path);
            }
        }
        for (val entry : was.entrySet()) {
            if (!expected.has(entry.getKey())) {
                assertEquals(entry.getValue(), now.get(entry.getKey()), entry.getKey() + " is untouched");
            }
        }
        for (val path : now.keySet()) {
            assertTrue(was.containsKey(path) || expected.has(path), path + " was not there and is not expected");
        }
    }

    /** Every file, hidden ones too, by its path from the folder, with its text. */
    @SneakyThrows
    private static Map<String, String> contents(Path root) {
        val out = new TreeMap<String, String>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (val p : (Iterable<Path>) walk.filter(Files::isRegularFile)::iterator) {
                out.put(root.relativize(p).toString().replace('\\', '/'), Files.readString(p));
            }
        }
        return out;
    }

    @Test
    @SneakyThrows
    void shouldSeeAHiddenFileThatChanges() {
        // the snapshot is the guard of the test above: it must notice a hidden file
        val folder = dir.resolve("hidden");
        Files.createDirectories(folder.resolve(".git"));
        Files.writeString(folder.resolve(".git/config"), "a");
        val before = snapshot(folder);
        Files.writeString(folder.resolve(".git/config"), "b");
        assertNotEquals(before, snapshot(folder));
    }

    /** Every file and folder, hidden ones too, with its bytes, its modification time and its size. */
    @SneakyThrows
    private static String snapshot(Path root) {
        try (Stream<Path> walk = Files.walk(root)) {
            return walk
                .sorted()
                .map(p -> {
                    try {
                        return (
                            root.relativize(p) +
                            "|" +
                            (Files.isDirectory(p)
                                ? "dir"
                                : Files.size(p) + "|" + java.util.HexFormat.of().formatHex(Files.readAllBytes(p))) +
                            "|" +
                            Files.getLastModifiedTime(p).toMillis()
                        );
                    } catch (java.io.IOException e) {
                        throw new java.io.UncheckedIOException(e);
                    }
                })
                .collect(Collectors.joining("\n"));
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

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
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
        copy(Path.of("src/test/resources").resolve(c.get("base").asText()), folder);
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
        val result = CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
        val expect = c.get("expect");
        if (expect.has("error")) {
            assertEquals(1, result.exit(), result.err());
            assertEquals(expect.get("error").asText() + "\n", result.err());
            assertEquals("", result.out());
        } else {
            val lines = new ArrayList<String>();
            expect.get("output").forEach(line -> lines.add(line.asText()));
            assertEquals(0, result.exit(), result.err());
            assertEquals(String.join("\n", lines) + "\n", result.out());
            assertEquals("", result.err());
        }
        assertEquals(before, snapshot(folder));
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

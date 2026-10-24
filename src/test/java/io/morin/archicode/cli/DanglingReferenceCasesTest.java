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
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * A reference that leads nowhere (a relationship destination, a {@code uses} entry, a hosted application) is told with the
 * element that holds it, the file that declares it and the key (wave 023, run 0165, issue #159). The cases are in
 * {@code dangling-reference-cases.json}, which the page runs too ({@code dangling-references.test.js}): both tools tell the
 * same sentences. A command that succeeded before still succeeds (a {@code null} in the case); the failure is raised where
 * it was.
 */
@QuarkusTest
class DanglingReferenceCasesTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/dangling-reference-cases.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private static JsonNode cases() {
        return new ObjectMapper().readTree(Files.readString(CASES)).get("cases");
    }

    static Stream<String> ids() {
        val ids = new ArrayList<String>();
        cases().forEach(c -> ids.add(c.get("id").asText()));
        return ids.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("ids")
    @SneakyThrows
    void shouldTellWhatTheCaseSays(String id) {
        JsonNode c = null;
        for (val candidate : cases()) {
            if (candidate.get("id").asText().equals(id)) {
                c = candidate;
            }
        }
        val folder = dir.resolve(id);
        Files.createDirectories(folder);
        Files.writeString(
            folder.resolve(".archicode.yaml"),
            "settings:\n  manifests:\n    paths: [\"manifests/**\"]\n"
        );
        for (val file : c.get("files").properties()) {
            val target = folder.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, file.getValue().asText());
        }
        for (val command : c.get("cli").properties()) {
            val args = new ArrayList<>(List.of("-w", folder.resolve(".archicode.yaml").toString()));
            args.addAll(List.of(command.getKey().split(" ")));
            if (!c.get("plateau").isNull()) {
                args.addAll(List.of("--plateau", c.get("plateau").asText()));
            }
            val result = CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
            val label = id + ": " + command.getKey() + ": " + result.err();
            if (command.getValue().isNull()) {
                assertEquals(0, result.exit(), label);
                continue;
            }
            assertEquals(1, result.exit(), label);
            val expected = new ArrayList<String>();
            command.getValue().forEach(line -> expected.add(line.asText()));
            val lines = result.err().lines().toList();
            assertTrue(lines.stream().allMatch(line -> line.startsWith("error: ")), label);
            assertEquals(
                expected,
                lines
                    .stream()
                    .map(line -> line.substring("error: ".length()))
                    .toList(),
                label
            );
            assertFalse(result.err().contains("\tat "), "no stack trace: " + label);
        }
    }
}

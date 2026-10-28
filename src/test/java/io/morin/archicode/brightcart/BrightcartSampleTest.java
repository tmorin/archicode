package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The Brightcart sample of the hosted editor (run 0193, {@code samples/brightcart.yaml}): the bundle of the fixture
 * {@code layered/}, which the page's codec wrote. It is split here by a splitter of this test, not the codec's, and the
 * command line reads what comes out: the files are the fixture's, byte for byte, and {@code plateau list},
 * {@code views generate} and {@code diff} say the same of them as of the fixture.
 */
@QuarkusTest
class BrightcartSampleTest {

    static final Path SAMPLE = Path.of("src/main/resources/editor-webapp/samples/brightcart.yaml");
    static final String SEPARATOR = "--- # file: ";
    static final String NO_FINAL_NEWLINE = " # no final newline";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    /** The files of a bundle, path to text: a separator line opens a file, which runs to the next one. */
    static Map<String, String> split(String bundle) {
        val files = new TreeMap<String, String>();
        val lines = new ArrayList<>(Arrays.asList(bundle.split("\n", -1)));
        lines.removeLast(); // the bundle ends with a newline: the last element is the empty text after it
        String path = null;
        boolean open = false;
        var body = new StringBuilder();
        for (val line : lines) {
            if (line.startsWith(SEPARATOR)) {
                if (path != null) files.put(path, body.toString());
                open = line.endsWith(NO_FINAL_NEWLINE);
                path = open
                    ? line.substring(SEPARATOR.length(), line.length() - NO_FINAL_NEWLINE.length())
                    : line.substring(SEPARATOR.length());
                body = new StringBuilder();
            } else {
                body.append(line).append('\n');
            }
        }
        if (path != null) files.put(path, body.toString());
        return files;
    }

    @SneakyThrows
    private static Map<String, String> sample() {
        return split(Files.readString(SAMPLE, StandardCharsets.UTF_8));
    }

    @SneakyThrows
    private static Map<String, String> fixture() {
        val files = new TreeMap<String, String>();
        try (val walk = Files.walk(Brightcart.LAYERED)) {
            for (val file : walk.filter(Files::isRegularFile).toList()) {
                files.put(
                    Brightcart.LAYERED.relativize(file).toString().replace('\\', '/'),
                    Files.readString(file, StandardCharsets.UTF_8)
                );
            }
        }
        return files;
    }

    @Test
    void holdsEveryFileOfTheFixtureWithTheSameBytes() {
        val fromSample = sample();
        val fromFixture = fixture();
        assertTrue(fromFixture.containsKey(".archicode.yaml"), "the fixture is a workspace");
        assertEquals(fromFixture.keySet(), fromSample.keySet(), "the sample carries the files of the fixture, no more");
        fromFixture.forEach((path, text) -> assertEquals(text, fromSample.get(path), path));
    }

    @SneakyThrows
    private Path written() {
        val folder = Files.createDirectories(dir.resolve("sample"));
        for (val entry : sample().entrySet()) {
            val target = folder.resolve(entry.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, entry.getValue(), StandardCharsets.UTF_8);
        }
        return folder.resolve(".archicode.yaml");
    }

    private Brightcart.Cli cli() {
        return new Brightcart.Cli(factory, errorOutput);
    }

    @SneakyThrows
    @Test
    void isReadByTheCommandLineLikeTheFixture() {
        val fixtureFolder = Files.createDirectories(dir.resolve("fixture"));
        val onFixture = Brightcart.copy(fixtureFolder);
        val onSample = written();

        for (val arguments : List.of(
            List.of("plateau", "list"),
            List.of("views", "generate", "--plateau", "marketplace"),
            List.of("diff", "--plateau", "marketplace", "--against", "inhouse")
        )) {
            val expected = cli().in(onFixture, arguments);
            val actual = cli().in(onSample, arguments);
            assertEquals(0, expected.exit(), expected.err());
            assertEquals(0, actual.exit(), String.join(" ", arguments) + ": " + actual.err());
            assertEquals(
                expected.out().replace(fixtureFolder.toString(), "<folder>"),
                actual.out().replace(onSample.getParent().toString(), "<folder>"),
                String.join(" ", arguments)
            );
            assertEquals(
                expected.err().replace(fixtureFolder.toString(), "<folder>"),
                actual.err().replace(onSample.getParent().toString(), "<folder>"),
                String.join(" ", arguments)
            );
        }
        val drawnFromFixture = Brightcart.tree(fixtureFolder.resolve("views-marketplace"));
        assertTrue(Brightcart.puml(fixtureFolder.resolve("views-marketplace")) > 0, "views were drawn");
        assertEquals(
            "",
            Brightcart.difference(drawnFromFixture, Brightcart.tree(onSample.getParent().resolve("views-marketplace"))),
            "the views drawn from the sample are those drawn from the fixture"
        );
    }
}

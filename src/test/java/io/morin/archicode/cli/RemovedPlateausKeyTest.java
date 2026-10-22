package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.LayeredFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The plateaus of waves 008 to 013 are gone (wave 014, run 0083, W-9): a workspace that still has {@code settings.plateaus}
 * fails, on every command, with one {@code error:} line that says the key no longer exists and what to write instead, and
 * {@code plateau add} and {@code --baseline} are gone too. The words of the line are pinned here; the editor says the same
 * sentence (wave 014, run 0084, W-10), and the shared cases M50 to M53 of {@code plateau-model-cases.json} and N41 of
 * {@code negative-cases.json} pin it in both tools.
 */
@QuarkusTest
class RemovedPlateausKeyTest {

    /** The sentence, word for word. */
    static final String SENTENCE =
        "error: `settings.plateaus` no longer exists: a plateau is a layer now. Remove the key, write `plateau: <id>` in the header of the manifests of each plateau, and declare each plateau in a manifest of kind `archicode.morin.io/plateau` (`id`, `name`, `override`: the plateau it builds on, `baseline` when absent, and `patches` for what it changes)";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private static final String SYSTEM =
        "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: s\n";

    private CliHarness.Result run(String... args) {
        val all = Stream.concat(
            Stream.of("-w", dir.resolve(".archicode.yaml").toString()),
            Arrays.stream(args)
        ).toArray(String[]::new);
        return CliHarness.run(factory, errorOutput, all);
    }

    @SneakyThrows
    private void workspaceWith(String settings) {
        Files.createDirectories(dir.resolve("p/a"));
        Files.createDirectories(dir.resolve("p/b"));
        Files.writeString(dir.resolve("p/a/s.yaml"), SYSTEM);
        Files.writeString(dir.resolve("p/b/s.yaml"), SYSTEM);
        Files.writeString(dir.resolve(".archicode.yaml"), settings);
    }

    private static void assertTheSentence(CliHarness.Result result) {
        assertEquals(1, result.exit(), result.err());
        assertEquals(List.of(SENTENCE), result.err().lines().toList(), result.err());
        assertFalse(result.err().contains("\tat "), "no stack trace: " + result.err());
        assertFalse(result.err().contains("Exception"), "no class name: " + result.err());
        assertFalse(result.err().contains("io.morin"), "no Java class: " + result.err());
        assertEquals("", result.out(), "nothing on the standard output");
    }

    @Test
    void everyCommandSaysTheKeyNoLongerExistsInOneLine() {
        workspaceWith("settings:\n  plateaus:\n    - id: a\n      path: p/a\n    - id: b\n      path: p/b\n");
        for (val command : List.of(
            List.of("diff"),
            List.of("diff", "--plateau", "b"),
            List.of("views", "generate"),
            List.of("views", "generate", "--plateau", "b", "--against", "a"),
            List.of("query", "graph"),
            List.of("query", "views"),
            List.of("plateau", "list")
        )) {
            assertTheSentence(run(command.toArray(String[]::new)));
        }
        assertFalse(Files.exists(dir.resolve("views")), "nothing is written");
        assertFalse(Files.exists(dir.resolve("views-b")), "nothing is written");
    }

    @Test
    void anEmptyListIsTheKeyToo() {
        workspaceWith("settings:\n  plateaus: []\n");
        assertTheSentence(run("views", "generate"));
        workspaceWith("settings:\n  plateaus:\n");
        assertTheSentence(run("plateau", "list"));
    }

    @Test
    void theKeyIsToldWhateverElseTheWorkspaceHas() {
        // layers beside the key: the key is told, and nothing else
        LayeredFixtures.write(dir);
        val file = dir.resolve(LayeredFixtures.WORKSPACE);
        write(file, read(file).replace("settings:\n", "settings:\n  plateaus:\n    - id: a\n      path: p/a\n"));
        assertTheSentence(run("plateau", "list"));
        assertTheSentence(run("diff", "--plateau", "inhouse"));
    }

    @SneakyThrows
    private static String read(Path file) {
        return Files.readString(file);
    }

    @SneakyThrows
    private static void write(Path file, String text) {
        Files.writeString(file, text);
    }

    @Test
    void theOptionOfTheOldMechanismIsGone() {
        LayeredFixtures.write(dir);
        val result = run("diff", "--plateau", "inhouse", "--baseline", "baseline");
        assertEquals(2, result.exit(), result.err());
        assertTrue(result.err().startsWith("Unknown option") && result.err().contains("'--baseline'"), result.err());
        assertEquals("", result.out());
        val generate = run("views", "generate", "--plateau", "inhouse", "--baseline", "baseline");
        assertEquals(2, generate.exit(), generate.err());
        assertTrue(
            generate.err().startsWith("Unknown option") && generate.err().contains("'--baseline'"),
            generate.err()
        );
    }

    @Test
    void theCommandThatAddedAPlateauIsGone() {
        LayeredFixtures.write(dir);
        val result = run("plateau", "add", "p", "--from", "baseline");
        assertEquals(2, result.exit(), result.err());
        assertTrue(result.err().contains("Unmatched argument"), result.err());
        assertEquals("", result.out());
        // and the others of the group stay
        val list = run("plateau", "list");
        assertEquals(0, list.exit(), list.err());
        assertTrue(list.out().startsWith("PLATEAU"), list.out());
    }

    @Test
    void againstAndPlateauListWork() {
        LayeredFixtures.write(dir);
        val diff = run("diff", "--plateau", "inhouse", "--against", "saas");
        assertEquals(0, diff.exit(), diff.err());
        assertTrue(diff.out().startsWith("comparing inhouse"), diff.out());
        val views = run("views", "generate", "--plateau", "inhouse", "--against", "saas");
        assertEquals(0, views.exit(), views.err());
        // the folders of the views: one for the plateau, one for the comparison
        assertTrue(Files.isDirectory(dir.resolve("views-inhouse")));
        assertTrue(Files.isDirectory(dir.resolve("views-inhouse-vs-saas")));
        assertFalse(Files.exists(dir.resolve("views-inhouse-vs-baseline")));
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * A saved view, or a story step, with no {@code properties} key at all is the same mistake as one with {@code properties: {}}
 * (wave 023, run 0164, issue #158): one {@code error:} line that names the view and the key to write, exit 1, no stack trace;
 * it was a {@code NullPointerException}. A map needs no element, so it draws without properties.
 */
@QuarkusTest
class ViewWithoutPropertiesTest {

    private static final String SENTENCE =
        "error: the view `probe` has no element: write the reference of one in `properties.element`\n";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private Path workspace(String viewpoint, String properties) {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/system.shop.yaml"),
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "shop"
              name: "Shop"
            """
        );
        Files.writeString(
            dir.resolve("manifests/view.probe.yaml"),
            """
            header:
              kind: "archicode.morin.io/view"
              version: "1"
            content:
              id: "probe"
              viewpoint: "%s"
              layer: "application"
            %s""".formatted(viewpoint, properties)
        );
        Files.writeString(
            dir.resolve("manifests/story.tour.yaml"),
            """
            header:
              kind: "archicode.morin.io/story"
              version: "1"
            content:
              id: "tour"
              steps:
                - viewpoint: "%s"
                  layer: "application"
                  text: "no properties here"
            """.formatted(viewpoint)
        );
        return Files.writeString(dir.resolve(".archicode.yaml"), "settings: {}\n");
    }

    private CliHarness.Result run(Path workspace, String... args) {
        val all = new String[args.length + 2];
        all[0] = "--workspace";
        all[1] = workspace.toString();
        System.arraycopy(args, 0, all, 2, args.length);
        return CliHarness.run(factory, errorOutput, all);
    }

    @ParameterizedTest
    @ValueSource(strings = { "overview", "detailed", "deep" })
    void aViewWithNoPropertiesSaysItHasNoElement(String viewpoint) {
        val result = run(workspace(viewpoint, ""), "views", "generate", "-i", "probe");
        assertEquals(1, result.exit(), result.err());
        assertEquals(SENTENCE, result.err());
    }

    @ParameterizedTest
    @ValueSource(strings = { "overview", "detailed", "deep" })
    void thePropertiesAreEmptyOrNullGivesTheSameLine(String viewpoint) {
        for (val properties : new String[] { "  properties: {}\n", "  properties:\n", "  properties: ~\n" }) {
            val result = run(workspace(viewpoint, properties), "views", "generate", "-i", "probe");
            assertEquals(1, result.exit(), properties + result.err());
            assertEquals(SENTENCE, result.err(), properties);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = { "overview", "detailed", "deep" })
    void aStepWithNoPropertiesSaysItToo(String viewpoint) {
        val result = run(workspace(viewpoint, ""), "stories", "generate");
        assertEquals(1, result.exit(), result.err());
        assertFalse(result.err().contains("unexpected"), result.err());
        assertEquals(SENTENCE.replace("`probe`", "`step_01`"), result.err());
    }

    @ParameterizedTest
    @ValueSource(strings = { "overview", "detailed", "deep" })
    void anElementThatExistsNowhereIsNamed(String viewpoint) {
        val result = run(
            workspace(viewpoint, "  properties:\n    element: gone\n"),
            "views",
            "generate",
            "-i",
            "probe"
        );
        assertEquals(1, result.exit(), result.err());
        assertEquals("error: the view `probe` names `gone`, which does not exist\n", result.err());
    }

    @Test
    void aMapNeedsNoPropertiesAndIsDrawn() {
        val result = run(workspace("map", ""), "views", "generate", "-i", "probe");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
    }
}

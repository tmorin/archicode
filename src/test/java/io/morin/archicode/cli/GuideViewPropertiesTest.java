package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.doc.GuideBlocks;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The properties of a view are typed {@code any} in the schema, so the guide says them in a table (wave 022, run 0159). The code
 * reads them by name, so the table is held to the code from both sides: from the editor, whose list of the keys it writes
 * ({@code VIEW_PROPERTY_ORDER}) is all in the guide, and from the command line, which draws a different file for each key the
 * guide says it reads and the same file for each key it says it ignores.
 */
@QuarkusTest
class GuideViewPropertiesTest {

    @Inject
    Guide guide;

    @Inject
    CommandLine commandLine;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    String text;

    @BeforeEach
    void workspace() {
        text = guide.render(commandLine.getCommandSpec());
        GuideBlocks.write(text, dir);
    }

    @SneakyThrows
    private String draw(String layer, String viewpoint, String properties) {
        return draw(layer, viewpoint, properties, "probe");
    }

    /** A saved view is drawn in the file of its id, whatever its viewpoint. */
    @SneakyThrows
    private String draw(String layer, String viewpoint, String properties, String file) {
        val view = new StringBuilder(
            "header:\n  kind: \"archicode.morin.io/view\"\n  version: \"1\"\ncontent:\n  id: \"probe\"\n  viewpoint: \"" +
                viewpoint +
                "\"\n  layer: \"" +
                layer +
                "\"\n"
        );
        if (!properties.isEmpty()) {
            view.append("  properties:\n").append(properties.indent(4));
        }
        Files.writeString(dir.resolve("manifests/view.probe.yaml"), view.toString());
        val result = CliHarness.run(
            factory,
            errorOutput,
            "views",
            "generate",
            "-i",
            "probe",
            "-w",
            dir.resolve(".archicode.yaml").toString()
        );
        assertEquals(0, result.exit(), result.err());
        return Files.readString(dir.resolve("views-to-be/plantuml/" + layer + "/" + file + ".puml"));
    }

    @Test
    void theKeysOfAMapChangeTheDrawing() {
        val bare = draw("application", "map", "");
        for (val properties : List.of("opened: [shop]", "hidden: [customer]", "pinned: [shop.web]")) {
            assertNotEquals(bare, draw("application", "map", properties), properties);
        }
        val open = draw("technology", "map", "opened: [prod, prod.vm]");
        assertNotEquals(open, draw("technology", "map", "opened: [prod, prod.vm]\napplications: false"));
        assertNotEquals(open, draw("technology", "map", "opened: [prod, prod.vm]\nrelationships: false"));
        assertEquals(
            open,
            draw("technology", "map", "opened: [prod, prod.vm]\napplications: true\nrelationships: true")
        );
    }

    @Test
    void theKeyOfAnElementViewChangesTheDrawing() {
        assertNotEquals(
            draw("application", "overview", "element: shop", "probe"),
            draw("application", "overview", "element: shop.catalog", "probe")
        );
    }

    @Test
    void aViewOfAnElementWithAnEmptyElementIsAnError() {
        val failed = tryDraw("application", "overview", "  properties: {}\n");
        assertEquals(1, failed.exit(), failed.err());
        assertTrue(failed.err().contains("has no element"), failed.err());
    }

    @SneakyThrows
    private CliHarness.Result tryDraw(String layer, String viewpoint, String properties) {
        Files.writeString(
            dir.resolve("manifests/view.probe.yaml"),
            "header:\n  kind: \"archicode.morin.io/view\"\n  version: \"1\"\ncontent:\n  id: \"probe\"\n  viewpoint: \"" +
                viewpoint +
                "\"\n  layer: \"" +
                layer +
                "\"\n" +
                properties
        );
        return CliHarness.run(
            factory,
            errorOutput,
            "views",
            "generate",
            "-i",
            "probe",
            "-w",
            dir.resolve(".archicode.yaml").toString()
        );
    }

    @Test
    void theKeysTheGuideSaysTheCommandLineIgnoresChangeNothing() {
        val bare = draw("application", "map", "");
        val ignored = List.of(
            "facet: nowhere",
            "hide-unlinked: true",
            "labels: false",
            "qualifiers: false",
            "descriptions: false",
            "wrap: true"
        );
        for (val properties : ignored) {
            assertEquals(bare, draw("application", "map", properties), properties);
        }
        val guideSaysSo = text.substring(text.indexOf("The keys `facet`"));
        for (val key : List.of("facet", "hide-unlinked", "labels", "qualifiers", "descriptions", "wrap")) {
            assertTrue(guideSaysSo.contains("`" + key + "`"), key);
        }
    }

    @Test
    @SneakyThrows
    void everyKeyTheEditorWritesIsInTheGuide() {
        val page = Files.readString(Path.of("src/main/resources/editor-webapp/standalone.html"));
        val keys = new java.util.TreeSet<String>();
        for (val name : List.of("VIEW_PROPERTY_ORDER", "MAP_PARTS", "DIAGRAM_SHOW_NAMES")) {
            val matcher = Pattern.compile("const " + name + " = \\[([^\\]]*)\\]").matcher(page);
            assertTrue(matcher.find(), name);
            val quoted = Pattern.compile("'([a-z-]+)'").matcher(matcher.group(1));
            while (quoted.find()) {
                keys.add(quoted.group(1));
            }
        }
        assertTrue(
            keys.containsAll(List.of("element", "pinned", "hidden", "opened", "facet", "hide-unlinked")),
            keys.toString()
        );
        for (val key : keys) {
            assertTrue(text.contains("`" + key + "`"), "the editor writes `" + key + "` and the guide does not say it");
        }
    }
}

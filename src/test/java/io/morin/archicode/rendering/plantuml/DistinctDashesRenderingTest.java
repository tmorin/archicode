package io.morin.archicode.rendering.plantuml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The lines of removed, split and merged boxes (run 0057, issue 55): the style of each state is written as the dash and the
 * gap PlantUML reads, and PlantUML draws three patterns that are not alike.
 *
 * <p>The text is checked without PlantUML. To have PlantUML 1.2024.7 itself draw a box for each state and read the dash
 * pattern it drew, give the path of its jar in the environment variable {@code PLANTUML_JAR} or the system property
 * {@code plantuml.jar}; without it, that test is skipped.
 */
class DistinctDashesRenderingTest {

    private static final List<String> STATES = List.of(
        "new",
        "changed",
        "contains-changes",
        "moved",
        "removed",
        "split",
        "merged"
    );
    private static final Pattern DASHES = Pattern.compile("stroke-dasharray:\\s*([0-9.]+),([0-9.]+)");

    @TempDir
    Path dir;

    /** A diagram with a box for each state, drawn with the default style of the state. */
    private static String diagram() {
        val puml = new StringBuilder("@startuml\n<style>\n");
        for (val state : STATES) {
            puml.append(PlantumlUtilities.generateStyle(ChangeMarks.style(state), state, "rectangle"));
        }
        puml.append("</style>\n");
        for (val state : STATES) {
            puml.append("rectangle \"").append(state).append("\" <<").append(state).append(">> as box_");
            puml.append(state.replace('-', '_')).append('\n');
        }
        return puml.append("@enduml\n").toString();
    }

    @Test
    void theStylesAreWrittenAsADashAndAGap() {
        val puml = diagram();
        assertTrue(
            puml.contains(".removed {\nrectangle {\nBackgroundColor: #EEEEEE\nLineColor: #7F7F7F\nLineStyle: 16-3\n")
        );
        assertTrue(puml.contains(".split {\nrectangle {\nLineColor: #CC79A7\nLineStyle: 8\n"));
        assertTrue(puml.contains(".merged {\nrectangle {\nLineColor: #56B4E9\nLineStyle: 3-9\n"));
        // the states that had one number keep it: nothing else changes in the style of a box
        assertTrue(puml.contains(".changed {\nrectangle {\nLineColor: #E69F00\nLineStyle: 2\n"));
        assertTrue(puml.contains(".moved {\nrectangle {\nLineColor: #0072B2\nLineStyle: 12\n"));
    }

    @Test
    @SneakyThrows
    void plantumlDrawsTheThreeStatesWithPatternsThatAreNotAlike() {
        val jar = Optional.ofNullable(System.getenv("PLANTUML_JAR")).or(() ->
            Optional.ofNullable(System.getProperty("plantuml.jar"))
        );
        Assumptions.assumeTrue(jar.isPresent(), "no PlantUML jar given (PLANTUML_JAR or -Dplantuml.jar)");
        Assumptions.assumeTrue(Files.isRegularFile(Path.of(jar.get())), jar.get() + " is not a file");

        val puml = dir.resolve("states.puml");
        Files.writeString(puml, diagram());
        val java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        val process = new ProcessBuilder(
            java,
            "-Djava.awt.headless=true",
            "-jar",
            jar.get(),
            "-tsvg",
            "-failfast2",
            puml.toString()
        )
            .redirectErrorStream(true)
            .redirectOutput(ProcessBuilder.Redirect.DISCARD)
            .start();
        assertEquals(0, process.waitFor(), "PlantUML refuses the file");

        // the boxes are drawn in the order of the file; a solid line (new) has no dash pattern
        val svg = Files.readString(dir.resolve("states.svg"));
        val drawn = new LinkedHashMap<String, String>();
        val colours = List.of("#009E73", "#E69F00", "#5B7C99", "#0072B2", "#7F7F7F", "#CC79A7", "#56B4E9");
        for (var i = 0; i < STATES.size(); i++) {
            val state = STATES.get(i);
            val box = Pattern.compile(
                "<rect[^>]*style=\"[^\"]*stroke:" + colours.get(i) + ";[^\"]*\"",
                Pattern.CASE_INSENSITIVE
            ).matcher(svg);
            assertTrue(box.find(), state + " is drawn");
            val dashes = DASHES.matcher(box.group());
            drawn.put(state, dashes.find() ? dashes.group(1) + "," + dashes.group(2) : "solid");
        }
        assertEquals("16.0,3.0", drawn.get("removed"));
        assertEquals("8.0,8.0", drawn.get("split"));
        assertEquals("3.0,9.0", drawn.get("merged"));
        for (val a : drawn.keySet()) {
            for (val b : drawn.keySet()) {
                if (a.compareTo(b) < 0) {
                    assertNotEquals(drawn.get(a), drawn.get(b), a + " and " + b + ": " + drawn);
                }
            }
        }
    }
}

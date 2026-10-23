package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.doc.GuideBlocks;
import io.morin.archicode.manifest.ManifestKind;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Nesting;
import io.morin.archicode.resource.element.technology.Technology;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.val;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * V4 of wave 022 (run 0159, issue #144): {@code archicode guide} against the code. Every command and option of the Picocli spec,
 * every kind of manifest and what it holds are in it; the first line is the version of the build; two runs give the same bytes,
 * which are the golden file ({@code src/test/resources/guide/golden.md}, where {@code @VERSION@} stands for the version, so that a
 * release does not change it); it is under its size budget; the workspace it ends with is written from its own blocks and its
 * {@code bash} blocks are run, exiting as they say.
 */
@QuarkusTest
class GuideTest {

    /** The size budget, in bytes: about 8k tokens, a guide read in one go. */
    static final int BUDGET = 30 * 1024;

    static final Path GOLDEN = Path.of("src/test/resources/guide/golden.md");

    @Inject
    Guide guide;

    @Inject
    CommandLine commandLine;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    MapperFactory mapperFactory;

    @ConfigProperty(name = "quarkus.application.version")
    String version;

    @TempDir
    Path dir;

    private String text() {
        return guide.render(commandLine.getCommandSpec());
    }

    @Test
    void theFirstLineIsTheVersionOfTheBuild() {
        assertEquals("archicode guide " + version, text().lines().findFirst().orElseThrow());
        assertFalse(version.isBlank());
    }

    @Test
    void twoRunsGiveTheSameBytesAndTheyAreTheGoldenFile() throws Exception {
        val first = text();
        assertEquals(first, text());
        assertTrue(first.endsWith("\n") && !first.endsWith("\n\n"), "one line feed at the end");
        assertFalse(first.contains("\r"), "line feeds only");
        assertEquals(Files.readString(GOLDEN).replace("@VERSION@", version), first);
    }

    @Test
    void itIsUnderItsBudget() {
        val size = text().getBytes(StandardCharsets.UTF_8).length;
        assertTrue(size <= BUDGET, "the guide is " + size + " bytes, the budget " + BUDGET);
    }

    @Test
    void everyCommandAndEveryOptionIsInTheGuide() {
        val text = text();
        val missing = new ArrayList<String>();
        collect(commandLine.getCommandSpec(), "archicode", text, missing);
        assertEquals(List.of(), missing);
    }

    private static void collect(CommandLine.Model.CommandSpec spec, String path, String text, List<String> missing) {
        if (!text.contains("`" + path + "`") && !text.contains("`" + path + "` `")) {
            missing.add("command " + path);
        }
        for (val option : spec.options()) {
            for (val name : option.names()) {
                if (!text.contains(name)) {
                    missing.add("option " + name + " of " + path);
                }
            }
        }
        for (val sub : spec.subcommands().entrySet()) {
            // an alias is the same command under another name
            if (sub.getValue().getCommandSpec().name().equals(sub.getKey())) {
                collect(sub.getValue().getCommandSpec(), path + " " + sub.getKey(), text, missing);
            }
        }
    }

    @Test
    void everyKindAndWhatItHoldsIsInTheGuide() {
        val text = text();
        val mapper = mapperFactory.create(MapperFormat.JSON);
        val application = Application.builder().build();
        val technology = Technology.builder().build();
        val missing = new ArrayList<String>();
        for (val kind : ManifestKind.values()) {
            val heading = "**" + kind.getSubTypeName() + "** `header.kind: " + kind.getId() + "`";
            val start = text.indexOf(heading);
            if (start < 0) {
                missing.add(kind.getId());
                continue;
            }
            val line = text.substring(start, text.indexOf('\n', start));
            if (Element.class.isAssignableFrom(kind.getType())) {
                val instance = (Element) mapper.convertValue(
                    Map.of("id", "x", "kind", kind.getSubTypeName()),
                    kind.getType()
                );
                val holds = Nesting.kindsHeldBy(instance);
                val layer = kind.getCategory() == Application.class ? application : technology;
                val expected =
                    (kind.getCategory() == Application.class ? "application" : "technology") +
                    " layer, " +
                    (Nesting.holdsAtTheTop(layer, instance) ? "may be" : "never") +
                    " the top of the layer, " +
                    (holds.isEmpty() ? "holds nothing" : "holds " + String.join(", ", holds));
                if (!line.endsWith(expected)) {
                    missing.add(kind.getId() + " nesting: " + line + " <> " + expected);
                }
            }
        }
        assertEquals(List.of(), missing);
    }

    @Test
    void itLoadsNoWorkspaceAndSaysTheSameFromAnyWorkspaceFile() {
        val plain = CliHarness.run(factory, errorOutput, "guide");
        assertEquals(0, plain.exit(), plain.err());
        assertEquals(text(), plain.out());
        assertEquals("", plain.err());
        val elsewhere = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            dir.resolve("none/.archicode.yaml").toString(),
            "guide"
        );
        assertEquals(0, elsewhere.exit(), elsewhere.err());
        assertEquals(plain.out(), elsewhere.out());
        assertEquals(plain.out(), CliHarness.run(factory, errorOutput, "guide", "-w", "/dev/null/x").out());
    }

    @Test
    @SneakyThrows
    void theWorkspaceOfTheGuideIsDrawnAndItsCommandsExitAsTheGuideSays() {
        val text = text();
        GuideBlocks.write(text, dir);
        val workspace = dir.resolve(".archicode.yaml").toString();
        val commands = GuideBlocks.commands(text);
        assertTrue(commands.size() >= 8, "the guide runs commands: " + commands.size());
        assertTrue(commands.stream().anyMatch(c -> c.exit() == 3), "it shows the exit code 3");
        assertTrue(commands.stream().anyMatch(c -> c.exit() == 1), "and the exit code 1");
        for (val command : commands) {
            val arguments = new ArrayList<>(command.arguments());
            arguments.add("-w");
            arguments.add(workspace);
            val result = CliHarness.run(factory, errorOutput, arguments.toArray(String[]::new));
            assertEquals(command.exit(), result.exit(), () -> command.line() + "\n" + result.out() + result.err());
            if (command.exit() == 1) {
                assertTrue(result.err().startsWith("error: "), result.err());
                assertEquals(1, result.err().strip().lines().count(), "one line: " + result.err());
            }
        }
        // the guide draws what it says it draws
        for (val file : List.of(
            "views-to-be/plantuml/application/shop-overview.puml",
            "views-to-be/plantuml/application/shop_web-deep.puml",
            "views-to-be/plantuml/application/apps_map.puml",
            "views-to-be/plantuml/technology/prod_map.puml",
            "views-to-be-vs-baseline/gap.md",
            "views-stories/tour/02-overview/gap.json"
        )) {
            assertTrue(Files.size(dir.resolve(file)) > 0, file);
        }
    }
}

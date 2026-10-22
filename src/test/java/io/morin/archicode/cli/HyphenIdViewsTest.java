package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * An element whose id holds a hyphen still gets a view that PlantUML renders (issue #38): the names of the boxes and of
 * the ends of the links are made of what PlantUML reads, in every kind of view, comparisons included.
 *
 * <p>The files are checked as text, which needs no PlantUML. To have PlantUML itself render them, give the path of a
 * PlantUML jar (the project is checked with {@code plantuml-1.2024.7.jar}) in the environment variable
 * {@code PLANTUML_JAR} or the system property {@code plantuml.jar}; without it, that test is skipped.
 */
@QuarkusTest
class HyphenIdViewsTest {

    private static final Path HYPHENS = Path.of("src/test/resources/hyphen-ids");
    private static final Path REPLACES = Path.of("src/test/resources/plateau-comparison/replaces");

    private static final Pattern READABLE = Pattern.compile("[\\p{L}\\p{N}_.]+");
    // `rectangle <name> <<stereotype>> ... [` and `rectangle <name> as "label" ... {`
    private static final Pattern BOX = Pattern.compile(
        "^(?:actor|card|database|node|person|rectangle) ([^\\s{]\\S*)(?: .*)?$"
    );
    // `<from> <arrow> <to> : label`; an arrow ends with `>` and holds no space
    private static final Pattern LINK = Pattern.compile("^(\\S+) \\S*> (\\S+)(?: : .*)?$");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private Path copy(Path fixture, String into) {
        val target = dir.resolve(into);
        try (val files = Files.walk(fixture)) {
            for (val source : files.toList()) {
                val destination = target.resolve(fixture.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(destination);
                } else {
                    Files.copy(source, destination);
                }
            }
        }
        return target;
    }

    private void generate(Path folder, String... more) {
        val args = new ArrayList<>(List.of("-w", folder.resolve(".archicode.yaml").toString(), "views", "generate"));
        args.addAll(List.of(more));
        val result = CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
        assertEquals(0, result.exit(), result.err());
    }

    @SneakyThrows
    private List<Path> pumls(Path folder) {
        try (val files = Files.walk(folder)) {
            return files
                .filter(f -> f.toString().endsWith(".puml"))
                .sorted()
                .toList();
        }
    }

    /** The names a file uses that PlantUML would not read, with where they are. */
    @SneakyThrows
    private List<String> unreadableNames(Path puml) {
        val problems = new ArrayList<String>();
        for (val line : Files.readAllLines(puml)) {
            for (val pattern : List.of(BOX, LINK)) {
                val matcher = pattern.matcher(line);
                if (matcher.matches()) {
                    for (var group = 1; group <= matcher.groupCount(); group++) {
                        if (matcher.group(group) != null && !READABLE.matcher(matcher.group(group)).matches()) {
                            problems.add(puml.getFileName() + ": " + line);
                        }
                    }
                }
            }
        }
        return problems;
    }

    @Test
    @SneakyThrows
    void everyNameOfEveryViewIsOneThatPlantumlReads() {
        val folder = copy(HYPHENS, "hyphen-ids");
        generate(folder);
        val files = pumls(folder);
        assertTrue(files.size() > 20, "views: " + files.size());
        val problems = new ArrayList<String>();
        files.forEach(f -> problems.addAll(unreadableNames(f)));
        assertEquals(List.of(), problems);
    }

    @Test
    @SneakyThrows
    void theBoxesAndTheLinksOfTwoIdsThatDifferByAHyphenAndAnUnderscoreStayTwo() {
        val folder = copy(HYPHENS, "hyphen-ids");
        generate(folder);
        val puml = Files.readString(folder.resolve("views/plantuml/application/shop_backoffice-detailed.puml"));
        // the id that needs no change keeps its name; the other one is told apart from it
        assertTrue(
            puml.contains("rectangle shop.backoffice.report_a <<container>> <<atomic>> [\nStock report\n"),
            puml
        );
        assertTrue(
            puml.contains("rectangle shop.backoffice.report_a_2 <<container>> <<atomic>> [\nSales report\n"),
            puml
        );
        assertTrue(
            puml.contains("shop.backoffice.web_front --> shop.backoffice.report_a_2 : asks for the sales\n"),
            puml
        );
        assertTrue(
            puml.contains("shop.backoffice.web_front --> shop.backoffice.report_a : asks for the stock\n"),
            puml
        );
        // a box that holds others is named the same way, its children and the ends of the links with it, and its label
        // says what the author wrote
        val deep = Files.readString(folder.resolve("views/plantuml/application/shop_backoffice_report-a-deep.puml"));
        assertTrue(
            deep.contains("rectangle shop.backoffice.report_a as \"Sales report\\n[container]\" <<composite>> {\n"),
            deep
        );
        assertTrue(
            deep.contains("rectangle shop.backoffice.report_a.parser_1 <<component>> <<atomic>> [\nParser\n"),
            deep
        );
        assertTrue(deep.contains("shop.backoffice.report_a.parser_1 --> shop.backoffice.report_a.printer_2\n"), deep);
        // the id is still the name of the file
        assertTrue(Files.exists(folder.resolve("views/plantuml/application/shop_backoffice_report-a-deep.puml")));
    }

    @Test
    @SneakyThrows
    void theViewsOfAComparisonUseNamesThatPlantumlReadsToo() {
        val folder = copy(REPLACES, "replaces");
        generate(folder, "--plateau", "after", "--against", "before");
        val comparison = pumls(folder.resolve("views-after-vs-before"));
        assertFalse(comparison.isEmpty());
        val shop = Files.readString(folder.resolve("views-after-vs-before/plantuml/application/shop-detailed.puml"));
        assertTrue(shop.contains("rectangle shop.report_a <<split>> <<container>> <<atomic>> [\n"), shop);
        assertTrue(shop.contains("rectangle shop.report_b <<split>> <<container>> <<atomic>> [\n"), shop);
        val problems = new ArrayList<String>();
        pumls(folder).forEach(f -> problems.addAll(unreadableNames(f)));
        assertEquals(List.of(), problems);
    }

    @Test
    @SneakyThrows
    void plantumlRendersEveryViewOfTheFixtures() {
        val jar = Optional.ofNullable(System.getenv("PLANTUML_JAR")).or(() ->
            Optional.ofNullable(System.getProperty("plantuml.jar"))
        );
        Assumptions.assumeTrue(jar.isPresent(), "no PlantUML jar given (PLANTUML_JAR or -Dplantuml.jar)");
        Assumptions.assumeTrue(Files.isRegularFile(Path.of(jar.get())), jar.get() + " is not a file");

        val hyphens = copy(HYPHENS, "hyphen-ids");
        generate(hyphens);
        val replaces = copy(REPLACES, "replaces");
        generate(replaces, "--plateau", "after", "--against", "before");

        val java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        val refused = new HashSet<String>();
        val files = new ArrayList<Path>();
        files.addAll(pumls(hyphens));
        files.addAll(pumls(replaces.resolve("views-after-vs-before")));
        for (val puml : files) {
            if (!renders(java, jar.get(), puml)) {
                refused.add(dir.relativize(puml).toString());
            }
        }
        assertTrue(files.size() > 30, "views: " + files.size());
        assertEquals(new HashSet<String>(), refused);
    }

    private boolean renders(String java, String jar, Path puml) throws IOException, InterruptedException {
        val process = new ProcessBuilder(
            java,
            "-Djava.awt.headless=true",
            "-jar",
            jar,
            "-tsvg",
            "-failfast2",
            puml.toString()
        )
            .redirectErrorStream(true)
            .redirectOutput(ProcessBuilder.Redirect.DISCARD)
            .start();
        return process.waitFor() == 0;
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode views generate --only-changes}: the views of a comparison keep what changed and the context it needs, and
 * nothing else of the output moves (#26, T6 of wave 015). The invented bookshop of {@code src/test/resources/plateau-comparison}
 * is generated twice into two copies, with and without the option, and the two are compared file by file.
 */
@QuarkusTest
class OnlyChangesTest {

    private static final Path FIXTURE = Path.of("src/test/resources/plateau-comparison");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    /** A copy of the bookshop (without the warehouse, a workspace of its own), the views generated into it. */
    @SneakyThrows
    private Path generated(String name, String... args) {
        val copy = dir.resolve(name);
        try (val files = Files.walk(FIXTURE)) {
            for (val source : files.toList()) {
                val relative = FIXTURE.relativize(source);
                if (relative.startsWith("replaces") || relative.endsWith("expected-counts.json")) {
                    continue;
                }
                val target = copy.resolve(relative.toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        val result = generate(copy, args);
        assertEquals(0, result.exit(), result.err());
        return copy;
    }

    private CliHarness.Result generate(Path workspaceFolder, String... args) {
        val all = new java.util.ArrayList<String>(
            List.of("-w", workspaceFolder.resolve("workspace.yaml").toString(), "views", "generate")
        );
        all.addAll(List.of(args));
        return CliHarness.run(factory, errorOutput, all.toArray(String[]::new));
    }

    @SneakyThrows
    private static Map<String, String> filesOf(Path folder) {
        val files = new TreeMap<String, String>();
        try (val walk = Files.walk(folder)) {
            for (val file : walk.filter(Files::isRegularFile).toList()) {
                files.put(folder.relativize(file).toString().replace('\\', '/'), read(file));
            }
        }
        return files;
    }

    private static String read(Path file) {
        try {
            return Files.readString(file);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void onlyTheViewsOfTheComparisonAreTrimmed() {
        val full = generated("full", "--plateau", "to-be", "-o", "views");
        val trimmed = generated("trimmed", "--plateau", "to-be", "-o", "views", "--only-changes");
        val before = filesOf(full);
        val after = filesOf(trimmed);

        // the same files, the same names
        assertEquals(before.keySet(), after.keySet());

        var smaller = 0;
        for (val name : before.keySet()) {
            val comparison = name.startsWith("views-to-be-vs-as-is");
            if (!comparison || name.endsWith("gap.md") || name.endsWith("gap.json")) {
                // the views of the plateau itself, and the table of changes, are what they were
                assertEquals(before.get(name), after.get(name), name);
            } else if (!before.get(name).equals(after.get(name))) {
                assertTrue(after.get(name).length() < before.get(name).length(), name + " is not shorter");
                smaller++;
            }
        }
        assertTrue(smaller > 0, "no view of the comparison was trimmed");
    }

    @Test
    void anUnchangedLinkIsLeftOutAndTheChangedOnesStay() {
        val full = generated("full", "--plateau", "to-be", "-o", "views");
        val trimmed = generated("trimmed", "--plateau", "to-be", "-o", "views", "--only-changes");
        val view = "views-to-be-vs-as-is/plantuml/application/shop-deep.puml";
        val unchanged = "shop.web --> shop.api : calls\\n[REST]";
        val changed = "shop.mobile -[thickness=3,#009E73]-> shop.api : **+** calls";

        assertTrue(read(full.resolve(view)).contains(unchanged), "the view has no unchanged link to leave out");
        assertFalse(read(trimmed.resolve(view)).contains(unchanged));
        assertTrue(read(full.resolve(view)).contains(changed), "the view has no new link to keep");
        assertTrue(read(trimmed.resolve(view)).contains(changed));
    }

    @Test
    void theViewsOfAFacetAreTrimmedToo() {
        val full = filesOf(generated("full", "--plateau", "to-be", "-o", "views"));
        val trimmed = filesOf(generated("trimmed", "--plateau", "to-be", "-o", "views", "--only-changes"));
        val facet = full
            .keySet()
            .stream()
            .filter(name -> name.startsWith("views-to-be-vs-as-is-no-orders/") && name.endsWith(".puml"))
            .filter(name -> !full.get(name).equals(trimmed.get(name)))
            .findFirst();
        assertTrue(facet.isPresent(), "no view of the facet of the comparison was trimmed");
    }

    @Test
    void aPlateauComparedWithASiblingIsTrimmed() {
        val full = filesOf(generated("full", "--plateau", "as-is", "--against", "to-be", "-o", "v"));
        val trimmed = filesOf(
            generated("trimmed", "--plateau", "as-is", "--against", "to-be", "-o", "v", "--only-changes")
        );
        assertEquals(full.keySet(), trimmed.keySet());
        assertTrue(
            full
                .keySet()
                .stream()
                .anyMatch(name -> name.startsWith("v-as-is-vs-to-be/") && !full.get(name).equals(trimmed.get(name)))
        );
    }

    @Test
    void withoutAComparisonTheOptionIsOneErrorLineAndNothingIsWritten() {
        val copy = generated("copy", "--plateau", "to-be", "-o", "views");
        // the root of the plateaus is compared with nothing
        val rootResult = generate(copy, "--plateau", "baseline", "--only-changes", "-o", "other");
        assertEquals(ErrorOutput.FAILURE, rootResult.exit());
        assertEquals("", rootResult.out());
        assertEquals(1, rootResult.err().lines().count(), rootResult.err());
        assertTrue(rootResult.err().startsWith("error: `--only-changes` cannot be used"), rootResult.err());
        assertTrue(rootResult.err().contains("--against"), rootResult.err());
        assertFalse(Files.exists(copy.resolve("other")), "something was written");
        assertFalse(Files.exists(copy.resolve("other-baseline")), "something was written");
    }

    @Test
    @SneakyThrows
    void aWorkspaceWithoutPlateauIsToldAndNothingIsWritten() {
        val copy = dir.resolve("plain");
        Files.createDirectories(copy);
        try (val files = Files.walk(Path.of("src/doc/examples/domain_workspace"))) {
            for (val source : files.toList()) {
                val target = copy.resolve(Path.of("src/doc/examples/domain_workspace").relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
        val result = generate(copy, "--only-changes", "-o", "out");
        assertEquals(ErrorOutput.FAILURE, result.exit());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(
            result.err().startsWith("error: `--only-changes` cannot be used: the workspace declares no plateau"),
            result.err()
        );
        assertFalse(Files.exists(copy.resolve("out")), "something was written");
    }

    @Test
    void theHelpSaysWhatTheOptionDraws() {
        val result = CliHarness.run(factory, errorOutput, "views", "generate", "--help");
        assertEquals(0, result.exit());
        assertTrue(result.out().contains("--only-changes"), result.out());
        assertTrue(result.out().contains("comparison"), result.out());
    }
}

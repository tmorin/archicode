package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.viewpoint.kernel.KernelStates;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode diff --fail-on}: the exit code 3 when the comparison holds a change of a state it was told to fail on, 0
 * when it does not, and the table exactly as it is printed without the option (T3 of wave 015, #25). Through the real picocli
 * command line, on the invented bookshop of {@code src/test/resources/plateau-comparison} (it holds new, changed and removed
 * rows, and a system that only contains changes) and on the invented warehouse of its {@code replaces} folder (it holds moved,
 * split and merged elements); neither is written to, {@code diff} writes nothing.
 */
@QuarkusTest
class DiffFailOnTest {

    private static final Path BOOKSHOP = Path.of("src/test/resources/plateau-comparison/workspace.yaml");
    private static final Path WAREHOUSE = Path.of("src/test/resources/plateau-comparison/replaces/workspace.yaml");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private CliHarness.Result diff(Path workspace, String... args) {
        val all = new ArrayList<String>(List.of("-w", workspace.toString(), "diff"));
        all.addAll(List.of(args));
        return CliHarness.run(factory, errorOutput, all.toArray(String[]::new));
    }

    /** to-be against as-is: new, changed and removed, and {@code shop}, which only contains changes. */
    private CliHarness.Result bookshop(String... failOn) {
        val args = new ArrayList<String>(List.of("--plateau", "to-be"));
        args.addAll(List.of(failOn));
        return diff(BOOKSHOP, args.toArray(String[]::new));
    }

    /** after against before: moved, split, merged, new and removed; nothing changed in place. */
    private CliHarness.Result warehouse(String... failOn) {
        val args = new ArrayList<String>(List.of("--plateau", "after"));
        args.addAll(List.of(failOn));
        return diff(WAREHOUSE, args.toArray(String[]::new));
    }

    @Test
    void aDifferenceWithoutFailOnIsStillExitZero() {
        val result = bookshop();
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().contains("new      element"), result.out());
    }

    @Test
    void everyStateOfTheBookshopFailsTheBuildAndTheTableIsTheSame() {
        val without = bookshop();
        for (val states : List.of("new", "changed", "removed", "contains-changes", "any", "new,removed")) {
            val result = bookshop("--fail-on", states);
            assertEquals(ErrorOutput.CHANGES_FOUND, result.exit(), states + "\n" + result.err());
            assertEquals(without.out(), result.out(), states);
            assertEquals(without.err(), result.err(), states);
        }
    }

    @Test
    void aStateTheComparisonDoesNotHoldIsExitZero() {
        for (val states : List.of("moved", "split", "merged", "moved,split,merged")) {
            val result = bookshop("--fail-on", states);
            assertEquals(0, result.exit(), states + "\n" + result.err());
            assertEquals(bookshop().out(), result.out(), states);
        }
    }

    @Test
    void movedSplitAndMergedAreStatesOfTheirOwnAndNotChanged() {
        for (val states : List.of("moved", "split", "merged", "new", "removed", "contains-changes", "any")) {
            val result = warehouse("--fail-on", states);
            assertEquals(ErrorOutput.CHANGES_FOUND, result.exit(), states + "\n" + result.err());
        }
        // nothing is changed in place on the warehouse: the replaced elements are not "changed" nor "removed"
        assertEquals(0, warehouse("--fail-on", "changed").exit());
    }

    @Test
    void theOptionMayBeRepeatedAndTheListMayHoldSpaces() {
        assertEquals(ErrorOutput.CHANGES_FOUND, bookshop("--fail-on", "moved", "--fail-on", "removed").exit());
        assertEquals(ErrorOutput.CHANGES_FOUND, bookshop("--fail-on", "moved, removed").exit());
        assertEquals(0, bookshop("--fail-on", "moved", "--fail-on", "split").exit());
    }

    @Test
    void theOtherFormatsAreUnchangedToo() {
        for (val format : List.of("markdown", "json")) {
            val without = bookshop("-f", format);
            val result = bookshop("-f", format, "--fail-on", "removed");
            assertEquals(ErrorOutput.CHANGES_FOUND, result.exit(), format);
            assertEquals(without.out(), result.out(), format);
        }
    }

    @Test
    void aComparisonWithNoDifferenceIsExitZeroForAny() {
        // as-is is an empty layer over the root
        val result = diff(BOOKSHOP, "--plateau", "as-is", "--fail-on", "any");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().contains("no difference"), result.out());
    }

    @Test
    void containsChangesIsTheElementThatDidNotChangeAndHoldsAChange() {
        // one new system at the top, with nothing below it and nothing above it: nothing contains a change
        val flat = write(
            "plateaus/10_as-is/shop.yaml",
            system("shop", "Shop", null),
            "plateaus/10_as-is/plateau.yaml",
            plateau("as-is", null, ""),
            "plateaus/20_to-be/plateau.yaml",
            plateau("to-be", "as-is", ""),
            "plateaus/20_to-be/crm.yaml",
            system("crm", "CRM", "to-be")
        );
        assertEquals(ErrorOutput.CHANGES_FOUND, diff(flat, "--plateau", "to-be", "--fail-on", "new").exit());
        assertEquals(0, diff(flat, "--plateau", "to-be", "--fail-on", "contains-changes").exit());

        // a new container below the system that did not change: the system contains a change, the container is new
        val nested = write(
            "plateaus/20_to-be/web.yaml",
            """
            header:
              kind: "archicode.morin.io/container"
              version: "1"
              plateau: "to-be"
              parent: "shop"
            content:
              id: "web"
              name: "Web"
            """
        );
        assertEquals(
            ErrorOutput.CHANGES_FOUND,
            diff(nested, "--plateau", "to-be", "--fail-on", "contains-changes").exit()
        );
    }

    @Test
    void aDescriptionThatIsTheOnlyChangeCountsUnlessTheTableLeavesItOut() {
        val workspace = write(
            "plateaus/10_as-is/shop.yaml",
            system("shop", "Shop", null),
            "plateaus/10_as-is/plateau.yaml",
            plateau("as-is", null, ""),
            "plateaus/20_to-be/plateau.yaml",
            plateau(
                "to-be",
                "as-is",
                """
                  patches:
                    - operator: SET
                      target: "shop"
                      field: description
                      value: "Sells books."
                """
            )
        );
        val table = diff(workspace, "--plateau", "to-be");
        assertTrue(table.out().contains("(wording only)"), table.out());
        assertEquals(ErrorOutput.CHANGES_FOUND, diff(workspace, "--plateau", "to-be", "--fail-on", "changed").exit());
        assertEquals(ErrorOutput.CHANGES_FOUND, diff(workspace, "--plateau", "to-be", "--fail-on", "any").exit());
        // --no-wording leaves the row out of the table: it is not a change that fails the build
        for (val states : List.of("changed", "any", "contains-changes")) {
            val result = diff(workspace, "--plateau", "to-be", "--no-wording", "--fail-on", states);
            assertEquals(0, result.exit(), states + "\n" + result.out());
        }
    }

    @Test
    void anUnknownStateIsOneErrorLineAndExitOneBeforeAnythingIsPrinted() {
        for (val states : List.of("bogus", "removed,bogus", "Removed", "")) {
            val result = bookshop("--fail-on", states);
            assertEquals(ErrorOutput.FAILURE, result.exit(), states);
            assertEquals("", result.out(), states);
            val lines = result.err().lines().toList();
            assertEquals(1, lines.size(), states + "\n" + result.err());
            assertTrue(lines.get(0).startsWith("error: `--fail-on`"), lines.get(0));
            // the words that can be used are told
            for (val word : KernelStates.all()) {
                assertTrue(lines.get(0).contains("`" + word + "`"), lines.get(0));
            }
            assertTrue(lines.get(0).contains("`any`"), lines.get(0));
        }
    }

    @Test
    void anEmptyStateInTheListIsToldAsSuch() {
        val result = bookshop("--fail-on", "removed,");
        assertEquals(ErrorOutput.FAILURE, result.exit());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().contains("empty state"), result.err());
    }

    @Test
    void aWorkspaceWithoutPlateauKeepsItsOwnError() {
        val result = diff(Path.of("src/doc/examples/domain_workspace/workspace.yaml"), "--fail-on", "any");
        assertEquals(ErrorOutput.FAILURE, result.exit());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: the workspace declares no plateau"), result.err());
    }

    @Test
    void theSevenWordsOfTheKernelAndAnyAreAccepted() {
        val words = new ArrayList<>(KernelStates.all());
        assertEquals(7, words.size());
        words.add("any");
        assertEquals(Set.copyOf(words), FailOn.parse(List.of(String.join(",", words))));
        assertThrows(ArchiCodeException.class, () -> FailOn.parse(List.of("none")));
        assertTrue(FailOn.parse(null).isEmpty());
    }

    @Test
    void theHelpSaysWhatTheExitCodesAre() {
        val result = CliHarness.run(factory, errorOutput, "diff", "--help");
        assertEquals(0, result.exit());
        assertTrue(result.out().contains("--fail-on"), result.out());
        assertTrue(result.out().contains("code 3"), result.out());
        for (val word : KernelStates.all()) {
            assertTrue(result.out().contains(word), word);
        }
        assertFalse(result.out().contains("--baseline-ref"), result.out());
    }

    // ---- a small workspace of two plateaus, written into the temporary folder

    private static String system(String id, String name, String plateau) {
        return """
        header:
          kind: "archicode.morin.io/system"
          version: "1"
        %s\
        content:
          id: "%s"
          name: "%s"
        """.formatted(plateau == null ? "" : "  plateau: \"" + plateau + "\"\n", id, name);
    }

    private static String plateau(String id, String override, String patches) {
        return """
        header:
          kind: "archicode.morin.io/plateau"
          version: "1"
        content:
          id: "%s"
        %s%s""".formatted(id, override == null ? "" : "  override: \"" + override + "\"\n", patches);
    }

    @SneakyThrows
    private Path write(String... pathsAndContents) {
        for (var i = 0; i < pathsAndContents.length; i += 2) {
            val file = dir.resolve(pathsAndContents[i]);
            Files.createDirectories(file.getParent());
            Files.writeString(file, pathsAndContents[i + 1]);
        }
        Files.writeString(
            dir.resolve("workspace.yaml"),
            "# two states\nsettings:\n  manifests:\n    paths: [\"plateaus/**\"]\n"
        );
        return dir.resolve("workspace.yaml");
    }
}

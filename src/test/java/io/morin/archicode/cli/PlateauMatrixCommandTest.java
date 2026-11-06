package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.LayeredFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode plateau matrix} through the command line: the path of plateaus and each refusal told before anything is
 * loaded, the files of {@code --output}, and the channels (the table on the standard output, the warnings on the error one).
 */
@QuarkusTest
class PlateauMatrixCommandTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private CliHarness.Result run(String... command) {
        val args = new ArrayList<String>(List.of("-w", dir.resolve(".archicode.yaml").toString(), "plateau", "matrix"));
        args.addAll(List.of(command));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    private void refused(String sentence, String... command) {
        LayeredFixtures.write(dir);
        val before = tree();
        val result = run(command);
        assertEquals(1, result.exit(), result.err());
        assertEquals("", result.out());
        // the warning of the fixture's tree (a plateau that only a header names) is told as it is on every command
        assertEquals(
            1,
            result
                .err()
                .lines()
                .filter(l -> l.startsWith("error: "))
                .count(),
            result.err()
        );
        assertTrue(
            result
                .err()
                .lines()
                .allMatch(l -> l.startsWith("error: ") || l.startsWith("warning: ")),
            result.err()
        );
        assertTrue(result.err().contains(sentence), result.err());
        assertFalse(result.err().contains("\tat "), "no stack trace");
        assertEquals(before, tree(), "nothing is written");
    }

    @SneakyThrows
    private List<String> tree() {
        try (Stream<Path> files = Files.walk(dir)) {
            return files
                .map(f -> dir.relativize(f).toString())
                .sorted()
                .toList();
        }
    }

    @Test
    void shouldPrintTheTableOfThePathOfTheLayeredWorkspace() {
        LayeredFixtures.write(dir);
        val result = run("baseline", "inhouse", "marketplace");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().startsWith("matrix of baseline, inhouse, marketplace\n"), result.out());
        assertTrue(result.out().contains("SPAN"), result.out());
        assertEquals(
            List.of(),
            tree()
                .stream()
                .filter(f -> f.contains("matrix"))
                .toList()
        );
    }

    @Test
    void shouldDeriveThePathFromThePlateauAndSkipThePlateauASkippedPathNames() {
        LayeredFixtures.write(dir);
        val derived = run("--plateau", "marketplace");
        assertEquals(0, derived.exit(), derived.err());
        assertEquals(run("baseline", "inhouse", "marketplace").out(), derived.out());
        val skipped = run("baseline", "marketplace");
        assertEquals(0, skipped.exit(), skipped.err());
        assertTrue(skipped.out().startsWith("matrix of baseline, marketplace\n"), skipped.out());
        assertFalse(skipped.out().contains("SPAN"), "two plateaus have no span");
    }

    @Test
    void shouldPrintTheFormatAsksFor() {
        LayeredFixtures.write(dir);
        val json = run("baseline", "inhouse", "-f", "json");
        assertEquals(0, json.exit(), json.err());
        assertTrue(json.out().startsWith("{\n  \"path\": [\n    \"baseline\""), json.out());
        assertTrue(run("baseline", "inhouse", "-f", "markdown").out().startsWith("# Matrix of baseline, inhouse"));
    }

    @Test
    void shouldRefuseFewerThanTwoPlateaus() {
        refused(
            "the matrix needs a path of at least two plateaus: `baseline` is the root and nothing is before it",
            "--plateau",
            "baseline"
        );
    }

    @Test
    void shouldRefuseASinglePlateauName() {
        refused("the matrix needs a path of at least two plateaus: `inhouse` is the only one named", "inhouse");
    }

    @Test
    void shouldRefuseAnUnknownId() {
        refused("unknown plateau `nowhere`", "baseline", "nowhere");
    }

    @Test
    void shouldRefuseTwoSiblings() {
        refused(
            "the plateaus `inhouse` and `saas` are not on one chain: `saas` is not a plateau that overrides `inhouse` (they are alternatives, both override `baseline`)",
            "inhouse",
            "saas"
        );
    }

    @Test
    void shouldRefuseASiblingInTheMiddleOfAPath() {
        refused("the plateaus `saas` and `inhouse` are not on one chain", "saas", "inhouse", "marketplace");
    }

    @Test
    void shouldRefuseAPlateauTwiceAndAPathInTheWrongOrder() {
        refused("the plateau `inhouse` is named twice", "baseline", "inhouse", "inhouse");
        refused("`inhouse` comes before `marketplace` in the tree", "marketplace", "inhouse");
    }

    @Test
    void shouldRefuseAPlateauWithIds() {
        refused(
            "name the plateaus of the path or give `--plateau`, not both",
            "baseline",
            "inhouse",
            "--plateau",
            "inhouse"
        );
    }

    @Test
    void shouldRefuseAFormatWithAnOutput() {
        refused("`--format` and `--output` do not go together", "baseline", "inhouse", "-f", "json", "-o");
    }

    @Test
    void shouldRefuseAForkedTreeWithNeitherIdsNorPlateau() {
        refused("the plateaus of this workspace are not one line");
    }

    @Test
    void shouldRefuseAWorkspaceWithNoPlateau() {
        LayeredFixtures.write(
            dir,
            java.util.Map.of(
                ".archicode.yaml",
                "settings:\n  manifests:\n    paths: [\"manifests\"]\n",
                "manifests/shop.yaml",
                "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"shop\"\n  name: \"Shop\"\n"
            )
        );
        val result = run("baseline", "inhouse");
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: the workspace declares no plateau"), result.err());
        assertEquals("", result.out());
    }

    @Test
    void shouldWriteTheTwoFilesBesideTheViewsAndReloadTheWorkspaceWithThemInPlace() {
        // `**` reads every folder below the workspace file: the folder of the matrix must be left out as a views folder is
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.WORKSPACE,
            files.get(LayeredFixtures.WORKSPACE).replace("[\"manifests/**\", \"plateaus/**\"]", "[\"./**\"]")
        );
        LayeredFixtures.write(dir, files);
        val result = run("baseline", "inhouse", "marketplace", "-o");
        assertEquals(0, result.exit(), result.err());
        val folder = dir.resolve("views-matrix-baseline-to-marketplace");
        assertEquals("wrote " + folder + "\n", result.out());
        assertTrue(Files.isRegularFile(folder.resolve("matrix.md")));
        assertTrue(Files.isRegularFile(folder.resolve("matrix.json")));
        assertEquals(
            run("baseline", "inhouse", "marketplace", "-f", "json").out(),
            read(folder.resolve("matrix.json"))
        );
        assertEquals(
            run("baseline", "inhouse", "marketplace", "-f", "markdown").out(),
            read(folder.resolve("matrix.md"))
        );

        val again = run("baseline", "inhouse", "marketplace", "-o");
        assertEquals(0, again.exit(), again.err());
        val reload = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "plateau",
            "list"
        );
        assertEquals(0, reload.exit(), reload.err());
    }

    @Test
    void shouldNameTheFolderAfterThePathGivenToOutput() {
        LayeredFixtures.write(dir);
        val result = run("baseline", "inhouse", "-o", "out/m");
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isRegularFile(dir.resolve("out/m-matrix-baseline-to-inhouse/matrix.md")));
        assertTrue(Files.isRegularFile(dir.resolve("out/m-matrix-baseline-to-inhouse/matrix.json")));
    }

    @Test
    void shouldNotReadAViewsPathThatAlreadyNamesThePlateau() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.WORKSPACE,
            files.get(LayeredFixtures.WORKSPACE).replace("settings:\n", "settings:\n  views:\n    path: \"out\"\n")
        );
        LayeredFixtures.write(dir, files);
        val result = run("baseline", "inhouse", "-o");
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isRegularFile(dir.resolve("out-matrix-baseline-to-inhouse/matrix.md")), result.out());
    }

    @Test
    void shouldKeepTheStandardOutputForTheTable() {
        LayeredFixtures.write(dir);
        val result = run("baseline", "inhouse", "marketplace");
        assertFalse(result.out().contains("warning:"), result.out());
    }

    private static String read(Path file) {
        try {
            return Files.readString(file);
        } catch (java.io.IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }
}

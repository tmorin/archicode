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
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * Draw, list and compare layered plateaus from the command line (run 0078, wave 014, W-4): {@code --plateau}, {@code
 * --against}, {@code plateau list}, the folders of the views and the cascade of a {@code REMOVE} in the table of changes.
 * The workspace is {@link LayeredFixtures}, written into a temporary folder. A failure is one {@code error:} line with no
 * stack trace.
 */
@QuarkusTest
class LayeredCommandsTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    private CliHarness.Result run(String... args) {
        val all = Stream.concat(
            Stream.of("-w", dir.resolve(LayeredFixtures.WORKSPACE).toString()),
            Arrays.stream(args)
        ).toArray(String[]::new);
        return CliHarness.run(factory, errorOutput, all);
    }

    private Path workspace() {
        return LayeredFixtures.write(dir);
    }

    private static List<String> errors(CliHarness.Result result) {
        return result
            .err()
            .lines()
            .filter(l -> l.startsWith("error: "))
            .toList();
    }

    private static List<String> warnings(CliHarness.Result result) {
        return result
            .err()
            .lines()
            .filter(l -> l.startsWith("warning: "))
            .toList();
    }

    private static final String HEADERS_ONLY_SAAS =
        "warning: the plateau `saas` exists only through the `plateau` key of the header of `plateaus/saas/platform.yaml`: it has no manifest of kind `archicode.morin.io/plateau`, so it overrides `baseline` and has no name";

    // ---- plateau list ----

    @Test
    void plateauListSaysEachPlateauItsParentAndWhereItComesFrom() {
        workspace();
        val result = run("plateau", "list");
        assertEquals(0, result.exit(), result.err());
        assertEquals(
            """
            PLATEAU      PARENT    SOURCE                                      NAME         HORIZON
            baseline     -         implicit                                    -            -
            inhouse      baseline  manifest plateaus/inhouse/plateau.yaml      In house     2027-Q1
            marketplace  inhouse   manifest plateaus/marketplace/plateau.yaml  Marketplace  2028-Q1
            saas         baseline  headers only (plateaus/saas/platform.yaml)  -            -
            """,
            result.out()
        );
        // what is odd is a warning, on the error output, and does not change the exit code
        assertEquals(List.of(HEADERS_ONLY_SAAS), warnings(result));
    }

    @Test
    void plateauListOfAWorkspaceWithoutPlateausIsTheRootAlone() {
        val files = new TreeMap<String, String>();
        files.put(".archicode.yaml", "settings:\n  manifests:\n    paths: [manifests]\n");
        files.put(
            "manifests/s.yaml",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: s\n"
        );
        LayeredFixtures.write(dir, files);
        val result = run("plateau", "list");
        assertEquals(0, result.exit(), result.err());
        assertEquals("PLATEAU   PARENT  SOURCE    NAME  HORIZON\nbaseline  -       implicit  -     -\n", result.out());
        assertEquals("", result.err());
    }

    @Test
    void plateauListFailsInOneLineOnAWrongTree() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.MARKETPLACE,
            files.get(LayeredFixtures.MARKETPLACE).replace("override: inhouse", "override: inhous")
        );
        LayeredFixtures.write(dir, files);
        val result = run("plateau", "list");
        assertEquals(1, result.exit());
        assertEquals(1, errors(result).size(), result.err());
        assertTrue(
            errors(result)
                .get(0)
                .startsWith("error: the plateau `marketplace` (`plateaus/marketplace/plateau.yaml`) overrides `inhous`")
        );
    }

    // ---- diff ----

    @Test
    void diffComparesAPlateauWithTheOneItOverridesByDefault() {
        workspace();
        val inhouse = run("diff", "--plateau", "inhouse");
        assertEquals(0, inhouse.exit(), inhouse.err());
        assertTrue(inhouse.out().startsWith("comparing inhouse (In house) with baseline\n"), inhouse.out());
        assertTrue(inhouse.out().contains("\nelements      +3 ~4 -1\nrelationships +1 ~1 -2\n"), inhouse.out());

        val marketplace = run("diff", "--plateau", "marketplace");
        assertEquals(0, marketplace.exit(), marketplace.err());
        assertTrue(
            marketplace.out().startsWith("comparing marketplace (Marketplace) with inhouse (In house)\n"),
            marketplace.out()
        );
        assertTrue(marketplace.out().contains("\nelements      +1 ~2 -1\nrelationships +1 ~0 -1\n"), marketplace.out());
    }

    @Test
    void diffAgainstBaselineIsTheRootAndSeveralStepsAreOneComparison() {
        workspace();
        val result = run("diff", "--plateau", "marketplace", "--against", "baseline");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().startsWith("comparing marketplace (Marketplace) with baseline\n"), result.out());
        assertTrue(result.out().contains("\nelements      +4 ~3 -2\nrelationships +2 ~1 -3\n"), result.out());
        // the cascade of the REMOVE of inhouse is in it: the plateaus between the two are the target's
        assertTrue(result.out().contains("inhouse"), result.out());
        assertTrue(result.out().contains("1 REMOVE target shop.cache"), result.out());
    }

    @Test
    void diffBetweenSiblings() {
        workspace();
        val result = run("diff", "--plateau", "inhouse", "--against", "saas");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().startsWith("comparing inhouse (In house) with saas\n"), result.out());
        assertTrue(result.out().contains("\nelements      +3 ~4 -2\nrelationships +1 ~1 -2\n"), result.out());
        assertTrue(result.out().contains("removed  element       application  platform"), result.out());
    }

    @Test
    void diffAgainstTheFutureIsAComparisonToo() {
        workspace();
        val result = run("diff", "--plateau", "inhouse", "--against", "marketplace");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result.out().startsWith("comparing inhouse (In house) with marketplace (Marketplace)\n"),
            result.out()
        );
        // nothing of the target's own patches is undone by the other side: no cascade
        assertFalse(result.out().contains("cascade"), result.out());
    }

    @Test
    void diffOfTheRootNeedsAnAgainst() {
        workspace();
        val result = run("diff", "--plateau", "baseline");
        assertEquals(1, result.exit());
        assertEquals(
            List.of(
                "error: the plateau `baseline` is the root of the plateaus and nothing is before it: there is nothing to compare it with. Name a plateau with `--against`"
            ),
            errors(result)
        );
        val withOne = run("diff", "--plateau", "baseline", "--against", "inhouse");
        assertEquals(0, withOne.exit(), withOne.err());
        assertTrue(withOne.out().startsWith("comparing baseline with inhouse (In house)\n"), withOne.out());
    }

    @Test
    void diffWithoutAPlateauOnATreeThatForksAsksForOne() {
        workspace();
        val result = run("diff");
        assertEquals(1, result.exit());
        assertEquals(
            List.of(
                "error: the plateaus of this workspace are not one line (`baseline` is overridden by `inhouse`, `saas`): name the plateau to read with `--plateau`, or with `settings.current`"
            ),
            errors(result)
        );
    }

    @Test
    void theErrorsOfAgainstAreOneLine() {
        workspace();
        assertEquals(
            List.of(
                "error: unknown plateau `nope`: the plateaus of this workspace are `baseline`, `inhouse`, `marketplace` and `saas`"
            ),
            errors(run("diff", "--plateau", "inhouse", "--against", "nope"))
        );
        assertEquals(
            List.of(
                "error: `--against inhouse` is the plateau that is compared: choose another plateau to compare it with"
            ),
            errors(run("diff", "--plateau", "inhouse", "--against", "inhouse"))
        );
        assertFalse(Files.exists(dir.resolve("views-inhouse")), "nothing is written before the mistake is told");
    }

    @Test
    void againstOnAWorkspaceWithoutPlateausIsOneLine() {
        val files = new TreeMap<String, String>();
        files.put(".archicode.yaml", "settings:\n  manifests:\n    paths: [manifests]\n");
        files.put(
            "manifests/s.yaml",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: s\n"
        );
        LayeredFixtures.write(dir, files);
        val result = run("views", "generate", "--against", "a");
        assertEquals(1, result.exit());
        assertEquals(
            List.of(
                "error: `--against a` cannot be used: the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)"
            ),
            errors(result)
        );
    }

    @Test
    void theCascadeOfAPlateauThatRemovesWhatAnAncestorAddedIsInTheComparisonsThatHaveIt() {
        val files = LayeredFixtures.files();
        files.put(
            "plateaus/bb/plateau.yaml",
            "header:\n  kind: \"archicode.morin.io/plateau\"\n  version: \"1\"\ncontent:\n  id: bb\n  override: inhouse\n  patches:\n    - operator: REMOVE\n      target: commerce\n"
        );
        LayeredFixtures.write(dir, files);
        // against its parent, inhouse has the elements inside commerce
        val parent = run("diff", "--plateau", "bb").out().replaceAll(" +", " ");
        assertTrue(parent.contains("bb 1 REMOVE target commerce removed application commerce.cart\n"), parent);
        assertFalse(parent.contains("shop.cache"), parent);
        // against baseline, which has none of it, only what the baseline has is part of the difference
        val root = run("diff", "--plateau", "bb", "--against", "baseline").out().replaceAll(" +", " ");
        assertFalse(root.contains("commerce.cart"), root);
        assertTrue(
            root.contains("inhouse 1 REMOVE target shop.cache dropped technology prod.vm applications: shop.cache\n"),
            root
        );
    }

    @Test
    void plateauListTellsUpToThreeFilesThenHowManyMore() {
        val files = new TreeMap<String, String>();
        files.put(".archicode.yaml", "settings:\n  manifests:\n    paths: [\"m/**\"]\n");
        for (val name : List.of("a", "b", "c", "d", "e")) {
            files.put(
                "m/" + name + ".yaml",
                "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\n  plateau: later\ncontent:\n  id: " +
                    name +
                    "\n"
            );
        }
        LayeredFixtures.write(dir, files);
        val result = run("plateau", "list");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().contains("headers only (m/a.yaml, m/b.yaml, m/c.yaml and 2 more)"), result.out());
    }

    @Test
    void settingsCurrentAndPlateauNameNothingWithoutPlateausAndStillSayIt() {
        val system = "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: s\n";
        LayeredFixtures.write(
            dir,
            Map.of(".archicode.yaml", "settings:\n  current: x\n  manifests:\n    paths: [m]\n", "m/s.yaml", system)
        );
        val current =
            "error: `settings.current` is `x` but the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)";
        assertEquals(List.of(current), errors(run("views", "generate")));
        assertEquals(List.of(current), errors(run("plateau", "list")));
        assertEquals(
            List.of(
                current,
                "error: `--plateau y` cannot be used: the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)"
            ),
            errors(run("diff", "--plateau", "y"))
        );
    }

    // ---- views generate ----

    @Test
    @SneakyThrows
    void viewsGenerateWritesThePlateauAndItsComparisonInFoldersNamedAfterThem() {
        workspace();
        val result = run("views", "generate", "--plateau", "marketplace");
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isDirectory(dir.resolve("views-marketplace/plantuml/application")));
        assertTrue(Files.isRegularFile(dir.resolve("views-marketplace-vs-inhouse/gap.md")));
        assertTrue(Files.isRegularFile(dir.resolve("views-marketplace-vs-inhouse/gap.json")));
        assertTrue(Files.isDirectory(dir.resolve("views-marketplace-vs-inhouse/plantuml")));
        // what is not drawn
        assertFalse(Files.exists(dir.resolve("views-inhouse")));
        assertFalse(Files.exists(dir.resolve("views")));
        // the plateau is drawn as it is: its elements and not the ones it removed
        assertTrue(Files.exists(dir.resolve("views-marketplace/plantuml/application/sellers-overview.puml")));
        assertFalse(Files.exists(dir.resolve("views-marketplace/plantuml/application/shop-cache-overview.puml")));

        val against = run("views", "generate", "--plateau", "marketplace", "--against", "baseline", "-o", "out");
        assertEquals(0, against.exit(), against.err());
        assertTrue(Files.isDirectory(dir.resolve("out-marketplace")));
        assertTrue(Files.isRegularFile(dir.resolve("out-marketplace-vs-baseline/gap.md")));
    }

    @Test
    @SneakyThrows
    void theRootIsDrawnAloneInItsOwnFolder() {
        workspace();
        val result = run("views", "generate", "--plateau", "baseline");
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isDirectory(dir.resolve("views-baseline/plantuml")));
        try (val folders = Files.list(dir)) {
            assertFalse(
                folders.anyMatch(f -> f.getFileName().toString().startsWith("views-baseline-vs")),
                "the root overrides nothing: no comparison"
            );
        }
    }

    @Test
    void theGapListsTheCascadeOfTheRemovalsOfThePlateau() {
        workspace();
        assertEquals(0, run("views", "generate", "--plateau", "inhouse").exit());
        val markdown = read("views-inhouse-vs-baseline/gap.md");
        assertTrue(
            markdown.endsWith(
                """

                ## Cascade of the removals

                What a `REMOVE` took besides the elements it selects, in the plateaus the target adds to the one it is compared with.

                | Plateau | Patch | Effect | Layer | Element | Detail |
                |---|---|---|---|---|---|
                | inhouse | 1 REMOVE target shop.cache | dropped | application | backoffice.console | relationships: shop.cache (flushes) |
                | inhouse | 1 REMOVE target shop.cache | dropped | application | shop.api | relationships: shop.cache (keeps baskets in) |
                | inhouse | 1 REMOVE target shop.cache | dropped | technology | prod.vm | applications: shop.cache |
                """
            ),
            markdown
        );
        val json = read("views-inhouse-vs-baseline/gap.json");
        assertTrue(json.contains("\"cascade\": ["), json);
        assertTrue(json.contains("\"detail\": \"applications: shop.cache\""), json);
        // a plateau whose patches took nothing besides what they named has no section
        assertEquals(0, run("views", "generate", "--plateau", "marketplace").exit());
        assertFalse(read("views-marketplace-vs-inhouse/gap.md").contains("Cascade"));
        assertFalse(read("views-marketplace-vs-inhouse/gap.json").contains("cascade"));
        // and the table on the standard output of diff says it too, in the three formats
        assertTrue(run("diff", "--plateau", "inhouse").out().contains("\ncascade of the removals"));
        assertTrue(run("diff", "--plateau", "inhouse", "-f", "markdown").out().contains("## Cascade of the removals"));
        assertTrue(run("diff", "--plateau", "inhouse", "-f", "json").out().contains("\"cascade\""));
    }

    @Test
    void aRemovedSubtreeIsListedWithItsElements() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.INHOUSE,
            files.get(LayeredFixtures.INHOUSE).replace("target: shop.cache", "target: shop")
        );
        // the patch that sets the name of shop.web and the others would miss: keep only the removal
        files.put(
            LayeredFixtures.INHOUSE,
            "header:\n  kind: \"archicode.morin.io/plateau\"\n  version: \"1\"\ncontent:\n  id: inhouse\n  patches:\n    - operator: REMOVE\n      target: shop\n"
        );
        files.put(
            "plateaus/inhouse/commerce.yaml",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\n  plateau: inhouse\ncontent:\n  id: commerce\n"
        );
        LayeredFixtures.write(dir, files);
        val result = run("diff", "--plateau", "inhouse");
        assertEquals(0, result.exit(), result.err());
        val cascade = result.out().substring(result.out().indexOf("cascade of the removals")).replaceAll(" +", " ");
        // the elements inside the removed one went with it; the entries of the elements that stay were taken out
        assertTrue(cascade.contains("inhouse 1 REMOVE target shop removed application shop.api\n"), cascade);
        assertTrue(cascade.contains("inhouse 1 REMOVE target shop removed application shop.web\n"), cascade);
        assertTrue(
            cascade.contains("dropped application backoffice.console relationships: shop.api (reads)\n"),
            cascade
        );
        assertTrue(cascade.contains("dropped technology prod.vm applications: shop.web\n"), cascade);
        // the element the patch names is a row of the table, not of the cascade
        assertFalse(cascade.contains("removed application shop\n"), cascade);
    }

    @Test
    @SneakyThrows
    void twoRunsGiveTheSameBytes() {
        workspace();
        for (val output : List.of("a", "b")) {
            val result = run("views", "generate", "--plateau", "marketplace", "-o", output);
            assertEquals(0, result.exit(), result.err());
        }
        for (val suffix : List.of("-marketplace", "-marketplace-vs-inhouse")) {
            val first = tree(dir.resolve("a" + suffix));
            val second = tree(dir.resolve("b" + suffix));
            assertFalse(first.isEmpty());
            assertEquals(first, second, "the same files, with the same bytes, in two runs");
        }
        assertEquals(run("diff", "--plateau", "marketplace").out(), run("diff", "--plateau", "marketplace").out());
        assertEquals(run("plateau", "list").out(), run("plateau", "list").out());
    }

    @SneakyThrows
    private String read(String file) {
        return Files.readString(dir.resolve(file));
    }

    @SneakyThrows
    private static Map<String, String> tree(Path root) {
        try (val files = Files.walk(root)) {
            return files.filter(Files::isRegularFile).collect(
                Collectors.toMap(
                    f -> root.relativize(f).toString(),
                    f -> {
                        try {
                            return Files.readString(f);
                        } catch (java.io.IOException e) {
                            throw new java.io.UncheckedIOException(e);
                        }
                    },
                    (a, b) -> a,
                    TreeMap::new
                )
            );
        }
    }

    // ---- the failures ----

    @Test
    void aPatchThatSelectsNothingIsOneLineOnTheCommandLine() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.INHOUSE,
            files.get(LayeredFixtures.INHOUSE).replace("target: shop.web", "target: shop.webb")
        );
        LayeredFixtures.write(dir, files);
        for (val command : List.of(
            new String[] { "diff", "--plateau", "inhouse" },
            new String[] { "views", "generate", "--plateau", "marketplace" },
            new String[] { "query", "graph", "--plateau", "inhouse" }
        )) {
            val result = run(command);
            assertEquals(1, result.exit(), result.err());
            assertEquals(
                List.of(
                    "error: plateau inhouse: patch 2 (SET target shop.webb): selects nothing, there is no element shop.webb in the application layer"
                ),
                errors(result)
            );
            assertFalse(result.err().contains("\tat "), "no stack trace");
        }
        assertFalse(Files.exists(dir.resolve("views-marketplace")), "nothing is written when the plateau is wrong");
    }

    @Test
    void aDanglingReferenceNamesTheLayerOnTheCommandLine() {
        val files = LayeredFixtures.files();
        files.put(
            LayeredFixtures.INHOUSE,
            files.get(LayeredFixtures.INHOUSE) +
                """
                    - operator: ADD
                      target: shop.web
                      field: relationships
                      value:
                        destination: nowhere
                        label: calls
                """
        );
        LayeredFixtures.write(dir, files);
        val result = run("diff", "--plateau", "marketplace");
        assertEquals(1, result.exit());
        assertEquals(
            List.of(
                "error: in the plateau `inhouse`, `shop.web` has a relationship towards `nowhere`, which does not exist, in `manifests/shop.yaml` at `relationships[1].destination`"
            ),
            errors(result)
        );
    }

    @Test
    void queryGraphReadsALayeredPlateau() {
        workspace();
        val result = run("query", "graph", "--plateau", "inhouse");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().contains("commerce"), result.out());
        assertFalse(result.out().contains("shop.cache"), result.out());
    }
}

package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.story.Story;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * A step of a story may say the plateau it is told at ({@code at}) and the plateau it is compared with ({@code against}),
 * wave 015 run 0101 (issue #24). The command line reads them and checks that they name plateaus; it does not draw stories.
 * The checks of a workspace that has plateaus are cases both tools run ({@code layer-checks-cases.json} K37 to K40 and
 * {@code negative-cases.json} N83 to N85); here are the reading, the workspace that has no plateau (the cases are all
 * layered), the shipped example and the rules of one step.
 */
@QuarkusTest
class StepPlateausTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private static final String SHOP = """
    header:
      kind: "archicode.morin.io/system"
      version: "1"
    content:
      id: "shop"
    """;

    @SneakyThrows
    private Path workspace(String workspaceYaml, String story) {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/shop.yaml"), SHOP);
        if (story != null) {
            Files.writeString(
                dir.resolve("manifests/story.tour.yaml"),
                """
                header:
                  kind: "archicode.morin.io/story"
                  version: "1"
                content:
                  id: "tour"
                  steps:
                """ + story
            );
        }
        return Files.writeString(dir.resolve(".archicode.yaml"), workspaceYaml);
    }

    private static final String MANIFESTS = "settings:\n  manifests:\n    paths: [\"manifests/**\"]\n";

    private static String step(String extra) {
        return "    - viewpoint: \"overview\"\n      properties:\n        element: \"shop\"\n" + extra;
    }

    @Test
    void shouldRefuseAStepThatNamesAPlateauInAWorkspaceWithNone() {
        val message = assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(
                workspace(MANIFESTS, step("      at: \"later\"\n") + step("      against: \"earlier\"\n")),
                null,
                null
            )
        ).getMessage();
        val none = " but the workspace declares no plateau" + WorkspaceFactory.NO_PLATEAU;
        assertEquals(
            "the story `tour` (`manifests/story.tour.yaml`) step 1 says `at: later`" +
                none +
                "\nthe story `tour` (`manifests/story.tour.yaml`) step 2 says `against: earlier`" +
                none,
            message
        );
    }

    @Test
    void shouldRefuseItInWorkspaceYamlToo() {
        val message = assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(
                workspace(
                    MANIFESTS +
                        "stories:\n  - id: old\n    steps:\n      - viewpoint: overview\n        at: later\n        properties:\n          element: shop\n",
                    null
                ),
                null,
                null
            )
        ).getMessage();
        assertEquals(
            "the story `old` (`.archicode.yaml`) step 1 says `at: later` but the workspace declares no plateau" +
                WorkspaceFactory.NO_PLATEAU,
            message
        );
    }

    @Test
    void shouldReadAnEmptyTextAsNothingAndLeaveAWorkspaceWithoutPlateausAlone() {
        val workspace = workspaceFactory.create(
            workspace(MANIFESTS, step("      at: \"\"\n      against:\n") + step("")),
            null,
            null
        );
        val steps = workspace.getStories().iterator().next().getSteps();
        assertEquals("", steps.get(0).getAt());
        assertNull(steps.get(0).getAgainst());
        assertNull(steps.get(1).getAt());
    }

    @Test
    void shouldReadAPlateauWrittenAsANumberAsTheTextItIs() {
        val message = assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(workspace(MANIFESTS, step("      at: 5\n")), null, null)
        ).getMessage();
        assertEquals(
            "the story `tour` (`manifests/story.tour.yaml`) step 1 says `at: 5` but the workspace declares no plateau" +
                WorkspaceFactory.NO_PLATEAU,
            message
        );
    }

    @Test
    void shouldTellTheRulesOfOneStep() {
        val plateaus = List.of("baseline", "to-be");
        val story = Story.Step.builder();
        // nothing, or one plateau of the workspace, or two of them: fine; `against` alone is read
        assertEquals(List.of(), problems(story.build(), plateaus));
        assertEquals(List.of(), problems(story.at("to-be").build(), plateaus));
        assertEquals(List.of(), problems(story.at("baseline").against("to-be").build(), plateaus));
        assertEquals(List.of(), problems(Story.Step.builder().against("baseline").build(), plateaus));
        // an empty text names nothing
        assertEquals(List.of(), problems(Story.Step.builder().at("").against("").build(), plateaus));
        // a plateau that is none, and a plateau compared with itself
        assertEquals(
            List.of(
                "the story `s` (`f`) step 3 says `at: nope`, which is not a plateau of this workspace (the plateaus are `baseline`, `to-be`)"
            ),
            problems(Story.Step.builder().at("nope").against("to-be").build(), plateaus)
        );
        assertEquals(
            List.of(
                "the story `s` (`f`) step 3 says `at: to-be` and `against: to-be`: a plateau is never compared with itself"
            ),
            problems(Story.Step.builder().at("to-be").against("to-be").build(), plateaus)
        );
        // two that are none: told in the order at, against, and the comparison with itself is not told on top of them
        assertEquals(2, problems(Story.Step.builder().at("nope").against("nope").build(), plateaus).size());
    }

    private static List<String> problems(Story.Step step, List<String> plateaus) {
        return LayerLoader.stepPlateauProblems("f", "s", 3, step, plateaus);
    }

    @Test
    void shouldLoadTheShippedExampleWithStepsToldAtPlateaus() {
        for (val plateau : List.of("baseline", "to-be")) {
            val workspace = workspaceFactory.create(
                Path.of("src/doc/examples/domain_plateaus/.archicode.yaml"),
                null,
                plateau
            );
            val story = workspace
                .getStories()
                .stream()
                .filter(s -> "migration".equals(s.getId()))
                .findFirst()
                .orElseThrow();
            // the story is the same whatever plateau is drawn, and its steps carry the two keys
            assertEquals(4, story.getSteps().size(), plateau);
            assertEquals("baseline", story.getSteps().get(0).getAt());
            assertNull(story.getSteps().get(0).getAgainst());
            assertEquals("to-be", story.getSteps().get(1).getAt());
            assertEquals("baseline", story.getSteps().get(1).getAgainst());
            assertNull(story.getSteps().get(3).getAt());
            assertEquals("baseline", story.getSteps().get(3).getAgainst());
        }
    }
}

package io.morin.archicode.resource.plateau;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.List;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The shape of the patches of a plateau: one selector each, the position being the one in the file. */
class PlateauShapeTest {

    private static Patch patch(String target, String jsonPath) {
        return Patch.builder().operator(Patch.Operator.REMOVE).target(target).jsonPath(jsonPath).build();
    }

    @Test
    void shouldCountAPatchThatIsNullInTheListWithoutSayingAnythingOfIt() {
        val plateau = Plateau.builder()
            .id("later")
            .patches(Arrays.asList(null, patch("shop", null), null, patch(null, null), patch("shop", "$.a")))
            .build();

        assertEquals(
            List.of(
                "`patches[3]` has no selector: write a `target` or a `json-path`",
                "`patches[4]` has a `target` and a `json-path`: write one of them"
            ),
            plateau.shapeProblems()
        );
        assertEquals(3, plateau.getPatches().size(), "the patches that are there");
    }

    @Test
    void shouldHaveNoProblemWithoutPatches() {
        assertEquals(List.of(), Plateau.builder().id("later").build().shapeProblems());
        assertEquals(List.of(), Plateau.builder().id("later").patches(null).build().shapeProblems());
        assertEquals(List.of(), Plateau.builder().id("later").patches(null).build().getPatches());
    }
}

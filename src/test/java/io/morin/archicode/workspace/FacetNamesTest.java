package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.resource.workspace.Settings;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Which facet names can be the name of a folder (wave 020, run 0146, issue #147, decision T2). The cases are {@code
 * facet-name-cases.json}, which {@code facet-names.test.js} runs on the editor: the sentence is the same word for word. A
 * workspace file that holds such a name is N94 to N104 of {@code negative-cases.json}, run by {@code
 * BrightcartNegativeCasesTest} on all the commands that load a workspace.
 */
class FacetNamesTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/facet-name-cases.json");

    @SneakyThrows
    private static List<JsonNode> cases() {
        val out = new ArrayList<JsonNode>();
        new ObjectMapper().readTree(CASES.toFile()).get("cases").forEach(out::add);
        return out;
    }

    static Stream<Integer> caseIndexes() {
        return Stream.iterate(0, i -> i + 1).limit(cases().size());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("caseIndexes")
    void shouldGiveTheSentenceOfTheCase(int index) {
        val c = cases().get(index);
        val expected = c.get("problem").isNull() ? null : c.get("problem").asText();
        assertEquals(expected, FacetNames.problemOf(c.get("name").asText()).orElse(null), c.get("what").asText());
    }

    @Test
    void shouldSayOneSentenceForEachFacetInTheOrderOfTheFile() {
        val settings = Settings.builder()
            .facets(
                Settings.Facets.builder()
                    .customs(
                        new java.util.LinkedHashSet<>(
                            List.of(
                                Settings.Facets.Facet.builder().name("fine").build(),
                                Settings.Facets.Facet.builder().name("a/b").build(),
                                Settings.Facets.Facet.builder().name("c:d").build()
                            )
                        )
                    )
                    .build()
            )
            .build();
        val problems = FacetNames.problems(settings);
        assertEquals(2, problems.size());
        assertTrue(problems.get(0).startsWith("the facet name `a/b` "), problems.get(0));
        assertTrue(problems.get(1).startsWith("the facet name `c:d` "), problems.get(1));
    }

    @Test
    void shouldSayNothingForTheFacetsOfAWorkspaceWithNone() {
        assertEquals(List.of(), FacetNames.problems(Settings.builder().build()));
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A facet is applied to the union of a comparison, which holds what only the plateau compared with has: a relationship that a
 * patch took out of the later plateau is still in the union, with its qualifiers and its tags, and a facet that removes
 * nothing leaves the views of the comparison as they are.
 */
@QuarkusTest
class FacetOnAComparisonTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private void write(String name, String text) {
        val file = dir.resolve(name);
        Files.createDirectories(file.getParent());
        Files.writeString(file, text);
    }

    private static final String REMOVED_LINK = "a -[dashed,#7F7F7F]-> b : **<U+2212>** calls\\n[async]";

    @SneakyThrows
    private void workspace() {
        write(
            ".archicode.yaml",
            """
            settings:
              name: "t"
              manifests:
                paths: ["manifests/**"]
              facets:
                customs:
                  - name: "nothing"
                    actions:
                      - operator: REMOVE
                        json-path: "$.application..elements[?(@.id == 'zzz')]"
                  - name: "kept"
                    actions:
                      - operator: REMOVE
                        json-path: "$.application..relationships[?(@.change == 'removed')]"
                  - name: "no-new"
                    actions:
                      - operator: REMOVE
                        json-path: "$.application..relationships[?(@.change == 'new')]"
                  - name: "unchanged"
                    actions:
                      - operator: REMOVE
                        json-path: "$.application..elements[?(@.change == 'changed')]"
            """
        );
        write(
            "manifests/a.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "a"
              relationships:
                - destination: "b"
                  label: "calls"
                  qualifiers: ["async"]
                  tags:
                    port: "80"
            """
        );
        write(
            "manifests/b.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "b"
            """
        );
        write(
            "manifests/c.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "c"
              relationships:
                - destination: "b"
                  label: "uses"
                  qualifiers: ["x"]
                  tags:
                    k: "v"
            """
        );
        write(
            "manifests/plateau.later.yaml",
            """
            header:
              kind: "archicode.morin.io/plateau"
              version: "1"
            content:
              id: "later"
              override: "baseline"
              patches:
                - operator: REMOVE
                  target: "a"
                  field: "relationships"
                - operator: ADD
                  target: "c"
                  field: "relationships"
                  value:
                    - destination: "a"
                      label: "talks"
            """
        );
    }

    @Test
    @SneakyThrows
    void aRelationshipOnlyTheBaselineHadStaysInTheViewsOfAFacetThatRemovesNothing() {
        workspace();
        val result = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "--plateau",
            "later",
            "-i",
            "a-overview"
        );
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());

        val whole = Files.readString(dir.resolve("views-later-vs-baseline/plantuml/application/a-overview.puml"));
        val faceted = Files.readString(
            dir.resolve("views-later-vs-baseline-nothing/plantuml/application/a-overview.puml")
        );
        assertTrue(whole.contains(REMOVED_LINK), whole);
        assertTrue(faceted.contains(REMOVED_LINK), faceted);
        assertEquals(whole, faceted, "a facet that removes nothing changes nothing");
        // the plateau itself has lost the relationship
        assertFalse(
            Files.readString(dir.resolve("views-later/plantuml/application/a-overview.puml")).contains("calls")
        );
    }

    @Test
    @SneakyThrows
    void aFacetCanSelectWhatChangedWithTheChangeOfAnElementOrARelationship() {
        workspace();
        val result = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "--plateau",
            "later",
            "-i",
            "a-overview"
        );
        assertEquals(0, result.exit(), result.err());

        val whole = Files.readString(dir.resolve("views-later-vs-baseline/plantuml/application/a-overview.puml"));
        val faceted = Files.readString(
            dir.resolve("views-later-vs-baseline-kept/plantuml/application/a-overview.puml")
        );
        assertTrue(whole.contains(REMOVED_LINK), "the comparison draws the relationship the later plateau lost");
        assertTrue(!faceted.contains("-> b"), "the facet removed the relationships that are removed:\n" + faceted);
        assertTrue(faceted.contains("rectangle a "), "and left the element: \n" + faceted);
    }

    @Test
    @SneakyThrows
    void aFacetCanSelectTheElementsThatChanged() {
        workspace();
        val result = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "--plateau",
            "later",
            "-i",
            "b-overview"
        );
        assertEquals(0, result.exit(), result.err());

        val whole = Files.readString(dir.resolve("views-later-vs-baseline/plantuml/application/b-overview.puml"));
        val faceted = Files.readString(
            dir.resolve("views-later-vs-baseline-unchanged/plantuml/application/b-overview.puml")
        );
        assertTrue(whole.contains("rectangle a "), "a lost its relationship towards b: it is drawn, changed\n" + whole);
        assertTrue(!faceted.contains("rectangle a "), "the facet removed the element that changed:\n" + faceted);
        assertTrue(faceted.contains("rectangle b "), faceted);
    }

    @Test
    @SneakyThrows
    void aFacetCanSelectTheRelationshipsThatAreNewAndLeavesTheOthersAlone() {
        workspace();
        val result = CliHarness.run(
            factory,
            errorOutput,
            "-w",
            dir.resolve(".archicode.yaml").toString(),
            "views",
            "generate",
            "--plateau",
            "later",
            "-i",
            "c-overview"
        );
        assertEquals(0, result.exit(), result.err());

        val whole = Files.readString(dir.resolve("views-later-vs-baseline/plantuml/application/c-overview.puml"));
        val faceted = Files.readString(
            dir.resolve("views-later-vs-baseline-no-new/plantuml/application/c-overview.puml")
        );
        assertTrue(whole.contains("talks"), "the comparison draws the new relationship:\n" + whole);
        assertTrue(whole.contains("uses"), "the relationship that did not change is drawn:\n" + whole);
        assertTrue(!faceted.contains("talks"), "the facet removed the new relationship:\n" + faceted);
        assertTrue(
            faceted.contains("uses") && faceted.contains("[x]"),
            "and kept the one that did not change:\n" + faceted
        );
    }
}

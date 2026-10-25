package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * What {@code archicode diff} says of what changed inside an element: a tag whose value changed, one that went, one that came,
 * the qualifiers that came, a description that was written; a comparison with no difference, and one whose only differences
 * are wording. The workspace is invented: a system {@code a} that calls {@code b}, and three plateaus over it.
 */
@QuarkusTest
class DiffDetailsTest {

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

    private static String plateau(String id, String name, String patches) {
        return (
            "header:\n  kind: \"archicode.morin.io/plateau\"\n  version: \"1\"\ncontent:\n  id: \"" +
            id +
            "\"\n" +
            (name == null ? "" : "  name: \"" + name + "\"\n") +
            "  override: \"baseline\"\n" +
            patches
        );
    }

    @BeforeEach
    void workspace() {
        write(".archicode.yaml", "settings:\n  name: \"t\"\n  manifests:\n    paths: [\"manifests/**\"]\n");
        write(
            "manifests/a.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "a"
              tags:
                team: "red"
                tier: "1"
              relationships:
                - destination: "b"
                  label: "calls"
            """
        );
        write(
            "manifests/b.yaml",
            "header:\n  kind: \"archicode.morin.io/system\"\n  version: \"1\"\ncontent:\n  id: \"b\"\n"
        );
        write(
            "manifests/plateau.later.yaml",
            plateau(
                "later",
                "The later one",
                """
                  patches:
                    - operator: SET
                      target: "a"
                      field: "tags"
                      value:
                        team: "blue"
                        zone: "eu"
                    - operator: SET
                      target: "a"
                      field: "qualifiers"
                      value: ["x", "y"]
                    - operator: SET
                      target: "a"
                      field: "description"
                      value: "hello"
                """
            )
        );
        write(
            "manifests/plateau.wording.yaml",
            plateau(
                "wording",
                null,
                """
                  patches:
                    - operator: SET
                      target: "b"
                      field: "description"
                      value: "hello"
                """
            )
        );
        write("manifests/plateau.same.yaml", plateau("same", null, ""));
    }

    private CliHarness.Result diff(String... more) {
        val args = new java.util.ArrayList<>(
            java.util.List.of("-w", dir.resolve(".archicode.yaml").toString(), "diff")
        );
        args.addAll(java.util.List.of(more));
        val result = CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
        return result;
    }

    @Test
    void shouldSayEachDetailThatChangedInsideAnElement() {
        assertEquals(
            """
            # Changes of later (The later one) compared with baseline

            | | new | changed | removed |
            |---|---:|---:|---:|
            | elements | 0 | 1 | 0 |
            | relationships | 0 | 0 | 0 |

            Wording only: 0 of the 1 changed elements.

            | Change | Thing | Layer | Reference | Natures | Details |
            |---|---|---|---|---|---|
            | changed | element | application | a | description,qualifiers,tags | description: (none) -> "hello"; qualifiers: +x +y; tags: team: red -> blue -tier +zone=eu |
            """,
            diff("--plateau", "later", "--format", "markdown").out()
        );
    }

    @Test
    @SneakyThrows
    void shouldGiveWhatWasAndWhatIsInJson() {
        val json = new ObjectMapper().readTree(diff("--plateau", "later", "--format", "json").out());
        assertEquals("later", json.at("/plateau/id").asText());
        assertEquals("The later one", json.at("/plateau/name").asText());
        assertEquals("baseline", json.at("/baseline/id").asText());
        val change = json.at("/changes/0");
        assertEquals("a", change.get("reference").asText());
        assertEquals("red", change.at("/before/tags/team").asText());
        assertEquals("1", change.at("/before/tags/tier").asText());
        assertEquals("blue", change.at("/after/tags/team").asText());
        assertEquals("eu", change.at("/after/tags/zone").asText());
        assertEquals(0, change.at("/before/qualifiers").size());
        assertEquals("[\"x\",\"y\"]", change.at("/after/qualifiers").toString());
        assertTrue(change.at("/before/description").isNull());
    }

    @Test
    void shouldSayThereIsNoDifference() {
        assertEquals(
            """
            # Changes of same compared with baseline

            | | new | changed | removed |
            |---|---:|---:|---:|
            | elements | 0 | 0 | 0 |
            | relationships | 0 | 0 | 0 |

            Wording only: 0 of the 0 changed elements.

            No difference.
            """,
            diff("--plateau", "same", "--format", "markdown").out()
        );
    }

    @Test
    void shouldSayThereIsNothingToListWhenOnlyWordingChangedAndItIsHidden() {
        assertEquals(
            """
            # Changes of wording compared with baseline

            | | new | changed | removed |
            |---|---:|---:|---:|
            | elements | 0 | 1 | 0 |
            | relationships | 0 | 0 | 0 |

            Wording only: 1 of the 1 changed elements. 1 wording-only change is hidden from the table.

            Nothing to list.
            """,
            diff("--plateau", "wording", "--no-wording", "--format", "markdown").out()
        );
        assertEquals(
            """
            comparing wording with baseline
            elements      +0 ~1 -0
            relationships +0 ~0 -0
            wording only  1 of the 1 changed elements
            1 wording-only change hidden (--no-wording)

            nothing to list
            """,
            diff("--plateau", "wording", "--no-wording").out()
        );
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.LayeredFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Locale;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A plateau says that an inherited field is gone with {@code REMOVE} and a {@code field} (wave 017, run 0126, #94), through the
 * real command line, on the workspaces of {@code field-removal-cases.json} (which {@code FieldRemovalCasesTest} reads for the
 * models and the tables): {@code diff} says the field changed and lists no cascade, {@code views generate} draws the plateau, a
 * {@code REMOVE} of a {@code kind} is one {@code error:} line, and the old form of {@code REMOVE} still removes the element.
 */
@QuarkusTest
class PatchTakesAFieldOutTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/field-removal-cases.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private Path workspace(String id, String... replace) {
        JsonNode chosen = null;
        for (val c : new ObjectMapper().readTree(Files.readString(CASES)).get("cases")) {
            if (c.get("id").asText().equals(id)) {
                chosen = c;
            }
        }
        val files = new LinkedHashMap<String, String>();
        chosen
            .get("files")
            .fields()
            .forEachRemaining(f -> files.put(f.getKey(), f.getValue().asText()));
        for (int i = 0; i < replace.length; i += 2) {
            for (val entry : files.entrySet()) {
                entry.setValue(entry.getValue().replace(replace[i], replace[i + 1]));
            }
        }
        return LayeredFixtures.write(dir.resolve(id + replace.length), files);
    }

    private CliHarness.Result run(Path workspace, String... args) {
        val all = new java.util.ArrayList<String>(java.util.List.of("-w", workspace.toString()));
        all.addAll(java.util.List.of(args));
        return CliHarness.run(factory, errorOutput, all.toArray(String[]::new));
    }

    @Test
    void diffSaysTheDescriptionChangedAndListsNoCascade() {
        val result = run(workspace("F01"), "diff", "--plateau", "lean");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err());
        assertTrue(result.out().contains("elements      +0 ~1 -0"), result.out());
        assertTrue(result.out().contains("changed  element"), result.out());
        assertTrue(result.out().contains("description"), result.out());
        assertFalse(
            result.out().toLowerCase(Locale.ROOT).contains("cascade"),
            "nothing left the graph: " + result.out()
        );
        assertEquals(3, run(workspace("F01"), "diff", "--plateau", "lean", "--fail-on", "changed").exit());
        assertEquals(
            0,
            run(workspace("F01"), "diff", "--plateau", "leaner", "--against", "lean", "--fail-on", "any").exit()
        );
    }

    @Test
    void viewsGenerateDrawsThePlateauWithoutTheField() {
        val workspace = workspace("F01");
        val result = run(workspace, "views", "generate", "--plateau", "lean");
        assertEquals(0, result.exit(), result.err());
        assertTrue(Files.isRegularFile(dir.resolve("F010/views-lean/plantuml/application/shop-overview.puml")));
        assertTrue(Files.isRegularFile(dir.resolve("F010/views-lean-vs-baseline/gap.json")));
    }

    @Test
    void theOldFormOfRemoveStillRemovesTheElementAndItsCascade() {
        val workspace = workspace("F06");
        val result = run(workspace, "diff", "--plateau", "other", "--against", "baseline");
        assertEquals(0, result.exit(), result.err());
        assertTrue(result.out().contains("removed  element"), result.out());
    }

    @Test
    void aKindCannotBeTakenOutAndTheMistakeIsOneLine() {
        val workspace = workspace("F01", "      field: description\n", "      field: kind\n");
        val result = run(workspace, "diff", "--plateau", "lean");
        assertEquals(1, result.exit());
        assertEquals(
            "error: plateau lean: patch 1 (REMOVE target shop): `kind` cannot be taken out: an element always has a kind",
            result.err().strip()
        );
    }
}

package io.morin.archicode.viewpoint.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.LayeredFixtures;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The {@code replaces} of the layers between two plateaus are composed (wave 017, run 0125, issue #89): a move made in two steps
 * is a move, a move then a split is a split, an element created in a layer in between and moved by the next is new, one that a
 * layer in between removed ends its chain, and a comparison with the plateau a plateau overrides is as it was. The cases are
 * {@code compose-replaces-cases.json}, which the editor runs too ({@code compose-replaces.test.js}): the two tools give the
 * same table.
 */
@QuarkusTest
class ComposeReplacesCasesTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/compose-replaces-cases.json");

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @SneakyThrows
    static Stream<Arguments> comparisons() {
        val document = new ObjectMapper().readTree(Files.readString(CASES));
        val out = new ArrayList<Arguments>();
        for (val c : document.get("cases")) {
            for (val comparison : c.get("comparisons")) {
                out.add(
                    Arguments.of(
                        c.get("id").asText() +
                            ": " +
                            comparison.get("plateau").asText() +
                            " compared with " +
                            comparison.get("against").asText(),
                        c,
                        comparison
                    )
                );
            }
        }
        return out.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("comparisons")
    @SneakyThrows
    void theTableIsTheOneOfTheCases(String name, JsonNode c, JsonNode comparison) {
        val files = new LinkedHashMap<String, String>();
        c.get("files")
            .fields()
            .forEachRemaining(f -> files.put(f.getKey(), f.getValue().asText()));
        val workspace = LayeredFixtures.write(dir.resolve(c.get("id").asText()), files);
        val target = workspaceFactory.create(workspace, null, comparison.get("plateau").asText());
        val base = workspaceFactory.create(workspace, null, comparison.get("against").asText());
        val answer = new PlateauComparer(objectMapper).compare(base, target);

        val rows = new ArrayList<String>();
        for (val row : answer.getChanges()) {
            if (row.thing().equals("element")) {
                val replaces = row.replaces() == null ? List.<String>of() : row.replaces();
                rows.add(
                    row.layer() +
                        "|" +
                        row.reference() +
                        "|" +
                        row.change().name().toLowerCase(java.util.Locale.ROOT) +
                        "|" +
                        String.join(",", replaces)
                );
            }
        }
        val want = new ArrayList<String>();
        comparison.get("rows").forEach(r -> want.add(r.asText()));
        val got = rows.stream().sorted().toList();
        assertEquals(want.stream().sorted().toList(), got, "the table");

        val warnings = new ArrayList<String>();
        comparison.get("warnings").forEach(w -> warnings.add(w.asText()));
        assertEquals(
            warnings,
            answer.getWarnings() == null ? List.of() : answer.getWarnings(),
            "what the kernel ignored"
        );
    }
}

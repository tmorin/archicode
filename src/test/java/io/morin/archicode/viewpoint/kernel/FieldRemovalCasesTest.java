package io.morin.archicode.viewpoint.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.LayeredFixtures;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * A patch can take a field out (wave 017, run 0126, issue #94): {@code REMOVE} with a {@code field}. The cases are {@code
 * field-removal-cases.json}, which the editor runs too ({@code field-removal.test.js}): the two tools give the same model
 * for each plateau and the same table for each comparison.
 */
@QuarkusTest
class FieldRemovalCasesTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/field-removal-cases.json");

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static JsonNode document() throws java.io.IOException {
        return new ObjectMapper().readTree(Files.readString(CASES));
    }

    @SneakyThrows
    static Stream<Arguments> resolved() {
        val out = new ArrayList<Arguments>();
        for (val c : document().get("cases")) {
            for (val want : c.get("resolved")) {
                out.add(
                    Arguments.of(
                        c.get("id").asText() +
                            ": " +
                            want.get("field").asText() +
                            " of " +
                            want.get("reference").asText() +
                            " in " +
                            want.get("plateau").asText(),
                        c,
                        want
                    )
                );
            }
        }
        return out.stream();
    }

    @SneakyThrows
    static Stream<Arguments> comparisons() {
        val out = new ArrayList<Arguments>();
        for (val c : document().get("cases")) {
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

    private Path write(JsonNode c) {
        val files = new LinkedHashMap<String, String>();
        c.get("files")
            .fields()
            .forEachRemaining(f -> files.put(f.getKey(), f.getValue().asText()));
        return LayeredFixtures.write(dir.resolve(c.get("id").asText()), files);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("resolved")
    void theFieldIsWhereThePlateauLeavesIt(String name, JsonNode c, JsonNode want) {
        Workspace workspace = workspaceFactory.create(write(c), null, want.get("plateau").asText());
        val reference = want.get("reference").asText();
        Element element = "technology".equals(want.get("layer").asText())
            ? workspace.techIndex.getElementByReference(reference)
            : workspace.appIndex.getElementByReference(reference);
        val got = switch (want.get("field").asText()) {
            case "name" -> objectMapper.valueToTree(element.getName());
            case "description" -> objectMapper.valueToTree(element.getDescription());
            case "tags" -> objectMapper.valueToTree(element.getTags());
            default -> throw new IllegalArgumentException(want.get("field").asText());
        };
        assertEquals(want.get("value"), got.isNull() ? objectMapper.nullNode() : got);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("comparisons")
    void theTableIsTheOneOfTheCases(String name, JsonNode c, JsonNode comparison) {
        val workspace = write(c);
        val target = workspaceFactory.create(workspace, null, comparison.get("plateau").asText());
        val base = workspaceFactory.create(workspace, null, comparison.get("against").asText());
        val answer = new PlateauComparer(objectMapper).compare(base, target);

        val rows = new ArrayList<String>();
        for (val row : answer.getChanges()) {
            if ("element".equals(row.thing())) {
                val natures = row.natures() == null ? List.<String>of() : row.natures();
                rows.add(
                    row.layer() +
                        "|" +
                        row.reference() +
                        "|" +
                        row.change().name().toLowerCase(Locale.ROOT) +
                        "|" +
                        String.join(",", natures.stream().sorted().toList())
                );
            }
        }
        val want = new ArrayList<String>();
        comparison.get("rows").forEach(r -> want.add(r.asText()));
        assertEquals(want.stream().sorted().toList(), rows.stream().sorted().toList(), "the table");
        assertEquals(List.of(), answer.getWarnings() == null ? List.of() : answer.getWarnings(), "no warning");
    }
}

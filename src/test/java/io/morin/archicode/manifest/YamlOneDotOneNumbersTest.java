package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * A plain scalar written as a YAML 1.1 number is read as that number by the command line, and its text is the number's ({@code 010}
 * is {@code 8}, {@code 1.50} is {@code 1.5}); where the target is a whole number or a boolean it is accepted ({@code line-gap: 0x1F});
 * the fields of a header are the text as written ({@code parent: 0} is the reference {@code 0.c}). The editor reads them the same way
 * since wave 018, run 0134 (issue #103): the cases are in {@code yaml-number-cases.json}, which {@code yaml-numbers.test.js} runs on
 * the editor. The expectations were written from this side, so this test is the record of what the command line does.
 */
@QuarkusTest
class YamlOneDotOneNumbersTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/yaml-number-cases.json");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    @SneakyThrows
    private static JsonNode document() {
        return JSON.readTree(Files.readString(CASES));
    }

    static Stream<String> caseIds() {
        val ids = new ArrayList<String>();
        document()
            .get("cases")
            .forEach(c -> ids.add(c.get("id").asText() + " " + c.get("title").asText()));
        return ids.stream();
    }

    @SneakyThrows
    @ParameterizedTest(name = "{0}")
    @MethodSource("caseIds")
    void shouldReadThePlainScalarAsTheCasesSay(String label) {
        val id = label.substring(0, label.indexOf(' '));
        JsonNode c = null;
        for (val candidate : document().get("cases")) {
            if (candidate.get("id").asText().equals(id)) {
                c = candidate;
            }
        }
        assertNotNull(c);
        Files.writeString(dir.resolve(".archicode.yaml"), "settings:\n  manifests:\n    paths: [manifests]\n");
        for (val file : c.get("files").properties()) {
            val target = dir.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, file.getValue().asText());
        }
        val expect = c.get("expect");
        val workspace = dir.resolve(".archicode.yaml");
        if (expect.has("error")) {
            val message = assertThrows(Exception.class, () -> workspaceFactory.create(workspace)).getMessage();
            val prefix = "`" + expect.get("file").asText() + "` is not valid: ";
            assertEquals(
                prefix + expect.get("error").asText(),
                message.replaceFirst(" \\(line \\d+, column \\d+\\)$", "")
            );
            return;
        }
        val loaded = workspaceFactory.create(workspace);
        val references = new ArrayList<String>();
        val qualifiers = new TreeMap<String, List<String>>();
        for (val index : List.of(loaded.appIndex, loaded.techIndex)) {
            index.elementByReferenceIndex.forEach((reference, element) -> {
                references.add(reference);
                if (!element.getQualifiers().isEmpty()) {
                    qualifiers.put(reference, new ArrayList<>(element.getQualifiers()));
                }
            });
        }
        references.sort(null);
        val expectedReferences = new ArrayList<String>();
        expect.get("references").forEach(r -> expectedReferences.add(r.asText()));
        assertEquals(expectedReferences, references);
        Map<String, List<String>> expectedQualifiers = new TreeMap<>();
        for (val entry : expect.path("qualifiers").properties()) {
            val list = new ArrayList<String>();
            entry.getValue().forEach(q -> list.add(q.asText()));
            expectedQualifiers.put(entry.getKey(), list);
        }
        assertEquals(expectedQualifiers, qualifiers);
    }
}

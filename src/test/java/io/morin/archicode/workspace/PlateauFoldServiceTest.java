package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.io.TempDir;

/** The cases of {@code fold-cases.json} that are whole workspaces, run through the service (wave 028, run 0207, #65). */
@QuarkusTest
class PlateauFoldServiceTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/fold-cases.json");

    @Inject
    PlateauFoldService service;

    @TempDir
    Path dir;

    @TestFactory
    @SneakyThrows
    Stream<DynamicTest> shouldRunEveryCaseOfTheFile() {
        val cases = new ObjectMapper().readTree(CASES.toFile()).get("cases");
        val tests = new ArrayList<DynamicTest>();
        for (JsonNode c : cases) {
            if (c.has("scope") && "command".equals(c.get("scope").asText())) {
                continue;
            }
            tests.add(DynamicTest.dynamicTest(c.get("id").asText() + " " + c.get("what").asText(), () -> run(c)));
        }
        return tests.stream();
    }

    @SneakyThrows
    private void run(JsonNode c) {
        val folder = dir.resolve(c.get("id").asText());
        copy(Path.of("src/test/resources").resolve(c.get("base").asText()), folder);
        val files = c.get("files");
        for (val name : (Iterable<String>) files::fieldNames) {
            val file = folder.resolve(name);
            Files.createDirectories(file.getParent());
            Files.writeString(file, files.get(name).asText());
        }
        val id = c.get("args").get(0).asText();
        val workspace = folder.resolve(".archicode.yaml");
        val expect = c.get("expect");
        if (expect.has("error")) {
            val thrown = assertThrows(ArchiCodeException.class, () -> service.plan(workspace, id));
            assertEquals(expect.get("error").asText(), "error: " + thrown.getMessage());
        } else {
            val lines = new ArrayList<String>();
            expect.get("output").forEach(line -> lines.add(line.asText()));
            assertEquals(String.join("\n", lines), FoldReport.render(service.plan(workspace, id)));
        }
    }

    @SneakyThrows
    private static void copy(Path from, Path to) {
        try (val walk = Files.walk(from)) {
            for (val source : (Iterable<Path>) walk::iterator) {
                val target = to.resolve(from.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else {
                    Files.copy(source, target);
                }
            }
        }
    }
}

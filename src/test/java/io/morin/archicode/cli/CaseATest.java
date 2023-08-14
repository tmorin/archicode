package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import lombok.SneakyThrows;
import lombok.val;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CaseATest extends AbstractGenerateViews {

    @SneakyThrows
    @Test
    void shouldCreate() {
        renderWithPlantuml(Path.of("src/test/workspaces/case_a.yaml"));
        val filePath = Path.of("src/test/workspaces/case_a_yaml/plantuml/application/sol_a_overview.puml");
        Awaitility.await().during(500, TimeUnit.MILLISECONDS).until(() -> filePath.toFile().exists());
        val actual = Files.readString(filePath);
        assertTrue(actual.contains("per_a --> sol_a : uses"));
        assertTrue(actual.contains("per_b --> sol_a : uses"));
    }
}

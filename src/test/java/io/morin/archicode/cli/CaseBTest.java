package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CaseBTest extends AbstractGenerateViews {

    @SneakyThrows
    @Test
    void shouldCreate() {
        renderWithPlantuml(Path.of("src/test/workspaces/case_b.yaml"), "env.node_a.cluster.authx_overview");
        val filePath = Path.of(
            "src/test/workspaces/case_b_yaml/plantuml/deployment/env.node_a.cluster.authx_overview.puml"
        );
        val actual = Files.readString(filePath);
        assertTrue(actual.contains("env.node_a.cluster.scp --> env.node_a.cluster.authx : uses"));
    }
}

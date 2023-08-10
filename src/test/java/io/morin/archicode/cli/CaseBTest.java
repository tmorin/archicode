package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CaseBTest extends AbstractRenderTest {

    @SneakyThrows
    @Test
    void shouldCreate() {
        renderWithPlantuml(Path.of("src/test/workspaces/case_b.yaml"), "env.node_a.cluster.authx_overview");
        //val filePath = Path.of("src/test/workspaces/case_b_yaml/plantuml/application/sol_b_overview.puml");
        //val actual = Files.readString(filePath);
        //assertTrue(actual.contains("per_b --> sol_a : **uses**"));
    }
}

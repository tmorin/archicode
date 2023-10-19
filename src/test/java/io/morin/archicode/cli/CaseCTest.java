package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CaseCTest extends AbstractGenerateViews {

    @SneakyThrows
    @Test
    void shouldCreate() {
        renderWithPlantuml(Path.of("src/test/workspaces/case_c.yaml"), "sol-deep");

        val outputDirPath = Path.of("src/test/workspaces/case_c_yaml-oidc");
        Assertions.assertTrue(outputDirPath.toFile().exists());
        Assertions.assertTrue(outputDirPath.toFile().isDirectory());
        /*
        val filePath = Path.of(
            "src/test/workspaces/case_b_yaml/plantuml/technology/env_node_a_cluster_authx-overview.puml"
        );
        val actual = Files.readString(filePath);
        assertTrue(actual.contains("env.node_a.cluster.scp --> env.node_a.cluster.authx : uses"));
         */
    }
}

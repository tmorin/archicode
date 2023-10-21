package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CaseCTest extends AbstractGenerateViews {

    @SneakyThrows
    @Test
    void shouldCreate() {
        renderWithPlantuml(Path.of("src/test/workspaces/case_c.yaml"), "sol-deep");

        val mainDirPath = Path.of("src/test/workspaces/case_c_yaml-main");
        assertTrue(mainDirPath.toFile().exists());
        assertTrue(mainDirPath.toFile().isDirectory());

        val oidcDirPath = Path.of("src/test/workspaces/case_c_yaml-oidc");
        assertTrue(oidcDirPath.toFile().exists());
        assertTrue(oidcDirPath.toFile().isDirectory());

        val observabilityDirPath = Path.of("src/test/workspaces/case_c_yaml-observability");
        assertTrue(observabilityDirPath.toFile().exists());
        assertTrue(observabilityDirPath.toFile().isDirectory());
    }
}

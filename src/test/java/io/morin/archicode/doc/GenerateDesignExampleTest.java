package io.morin.archicode.doc;

import io.morin.archicode.cli.AbstractGenerateViews;
import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GenerateDesignExampleTest extends AbstractGenerateViews {

    @Test
    @SneakyThrows
    void design_example_step_1() {
        val wksPath = Path.of("src/doc/examples/design_example_step_1/workspace_relationship.yaml");
        val viewIds = new String[] {};
        renderWithDefault(wksPath, viewIds);
    }
}

package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.morin.archicode.cli.AbstractGenerateViews;
import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GenerateDesignExampleTest extends AbstractGenerateViews {

    @Test
    @SneakyThrows
    void design_example_step_1() {
        val wksPath = Path.of("src/doc/examples/design_example_step_1/workspace_relationship.yaml");
        val viewpointNames = Set.of("overview");
        val viewIds = Set.<String>of();
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }

    @Test
    @SneakyThrows
    void design_example_step_2() {
        val wksPath = Path.of("src/doc/examples/design_example_step_2/workspace_refined.yaml");
        val viewpointNames = Set.of("overview", "detailed");
        val viewIds = Set.<String>of();
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }

    @Test
    @SneakyThrows
    void design_example_step_3() {
        val wksPath = Path.of("src/doc/examples/design_example_step_3/workspace_refined.yaml");
        val viewpointNames = Set.<String>of();
        val viewIds = Set.<String>of();
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }
}

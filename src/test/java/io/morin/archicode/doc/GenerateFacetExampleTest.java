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
class GenerateFacetExampleTest extends AbstractGenerateViews {

    @Test
    @SneakyThrows
    void facet_example_step_1() {
        val wksPath = Path.of("src/doc/examples/facet_example_step_1/workspace.yaml");
        val viewpointNames = Set.of("deep");
        val viewIds = Set.of("EcommercePlatform-deep");
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }

    @Test
    @SneakyThrows
    void facet_example_step_2() {
        val wksPath = Path.of("src/doc/examples/facet_example_step_2/workspace.yaml");
        val viewpointNames = Set.of("deep");
        val viewIds = Set.of("EcommercePlatform-deep");
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }

    @Test
    @SneakyThrows
    void facet_example_step_3() {
        val wksPath = Path.of("src/doc/examples/facet_example_step_3/workspace.yaml");
        val viewpointNames = Set.of("deep");
        val viewIds = Set.of("EcommercePlatform-deep");
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }

    @Test
    @SneakyThrows
    void facet_example_step_4() {
        val wksPath = Path.of("src/doc/examples/facet_example_step_4/workspace.yaml");
        val viewpointNames = Set.of("deep");
        val viewIds = Set.of("EcommercePlatform-deep");
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }
}

package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.morin.archicode.cli.AbstractGenerateViews;
import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@QuarkusTest
class GenerateFacetExampleTest extends AbstractGenerateViews {

    @SneakyThrows
    @ValueSource(
        strings = {
            "src/doc/examples/facet_example_step_1/workspace.yaml",
            "src/doc/examples/facet_example_step_2/workspace.yaml",
            "src/doc/examples/facet_example_step_3/workspace.yaml",
            "src/doc/examples/facet_example_step_4/workspace.yaml"
        }
    )
    @ParameterizedTest
    void facet_example_step(String wksPathAsString) {
        val wksPath = Path.of(wksPathAsString);
        val viewpointNames = Set.of("deep");
        val viewIds = Set.of("EcommercePlatform-deep");
        assertDoesNotThrow(() -> renderWithDefault(wksPath, viewpointNames, viewIds));
    }
}

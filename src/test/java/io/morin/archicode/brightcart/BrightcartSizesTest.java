package io.morin.archicode.brightcart;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.cli.ErrorOutput;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import picocli.CommandLine;

/**
 * The four plateaus of Brightcart are the sizes of the document (wave 012, run 0061): the loader of the command line
 * reads {@code folders/} and {@code query graph --plateau <id>} lists as many elements (per layer) and relationships as
 * {@code expected/sizes.json} records. A plateau that loses a manifest, an element or a relationship, or a loader that
 * stops reading one, fails here before it fails in a comparison.
 */
@QuarkusTest
class BrightcartSizesTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    static Path dir;

    private static Path workspace;

    @ParameterizedTest
    @ValueSource(strings = { "baseline", "saas", "inhouse", "marketplace" })
    void theGraphOfAPlateauHasTheElementsAndRelationshipsOfTheDocument(String plateau) {
        if (workspace == null) {
            workspace = Brightcart.copyFolders(dir);
        }
        val result = new Brightcart.Cli(factory, errorOutput).in(
            workspace,
            List.of("query", "graph", "--plateau", plateau)
        );
        assertEquals(0, result.exit(), result.err());
        val graph = parse(result.out());
        val want = Brightcart.expected("sizes").at("/plateaus/" + plateau);
        assertEquals(want.get("elements").asInt(), graph.get("elements").size(), plateau + " elements");
        assertEquals(want.get("relationships").asInt(), graph.get("relationships").size(), plateau + " relationships");
        for (val layer : List.of("application", "technology")) {
            var n = 0;
            for (val element : graph.get("elements")) {
                if (element.get("layer").asText().equals(layer)) {
                    n++;
                }
            }
            assertEquals(want.get(layer).asInt(), n, plateau + " " + layer);
        }
    }

    @SneakyThrows
    private static JsonNode parse(String json) {
        return Brightcart.MAPPER.readTree(json);
    }
}

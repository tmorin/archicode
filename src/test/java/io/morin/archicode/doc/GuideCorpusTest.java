package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.cli.GetSchemasQuery;
import io.morin.archicode.cli.Guide;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import lombok.val;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

/**
 * C4 of wave 022 (run 0159): the manifests of the guide are in the corpus, they conform to the schema that
 * {@code archicode query schemas manifest} prints, and between them they use every kind the guide's example can (the loading and
 * the drawing are in {@code GuideTest}).
 */
@QuarkusTest
class GuideCorpusTest {

    @Inject
    Guide guide;

    @Inject
    CommandLine commandLine;

    @Inject
    GetSchemasQuery query;

    @Inject
    MapperFactory mapperFactory;

    @Test
    void theManifestsOfTheGuideConformToTheSchema() {
        val checker = new SchemaChecker(
            (JsonNode) query.generateSchema(
                GetSchemasQuery.SchemaType.MANIFEST,
                GetSchemasQuery.sortedWriter(mapperFactory)
            )
        );
        val manifests = ManifestCorpus.guide(guide.render(commandLine.getCommandSpec()));
        assertTrue(manifests.size() >= 10, "the guide ships a workspace: " + manifests.size());
        val failures = new ArrayList<String>();
        val kinds = new TreeSet<String>();
        for (val manifest : manifests) {
            val problems = checker.problems(manifest.document());
            if (!problems.isEmpty()) {
                failures.add(manifest.file() + ": " + problems);
            }
            kinds.add(manifest.document().path("header").path("kind").asText());
        }
        assertEquals(List.of(), failures);
        assertEquals(
            new TreeSet<>(
                List.of(
                    "archicode.morin.io/container",
                    "archicode.morin.io/environment",
                    "archicode.morin.io/person",
                    "archicode.morin.io/plateau",
                    "archicode.morin.io/story",
                    "archicode.morin.io/system",
                    "archicode.morin.io/view"
                )
            ),
            kinds,
            "the example shows a manifest of each kind an author starts with"
        );
    }
}

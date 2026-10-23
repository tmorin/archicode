package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.cli.GetSchemasQuery;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/** C3 of wave 022 (run 0160): the manifests {@code archicode init} writes are in the corpus and conform to the schema. */
@QuarkusTest
class InitCorpusTest {

    @Inject
    CommandLine commandLine;

    @Inject
    GetSchemasQuery query;

    @Inject
    MapperFactory mapperFactory;

    @TempDir
    Path dir;

    @Test
    void theManifestsInitWritesConformToTheSchema() {
        assertEquals(0, commandLine.execute("init", dir.toString()));
        val manifests = ManifestCorpus.init(dir);
        assertEquals(3, manifests.size(), "a person, a system with a container, a view");
        val checker = new SchemaChecker(
            (JsonNode) query.generateSchema(
                GetSchemasQuery.SchemaType.MANIFEST,
                GetSchemasQuery.sortedWriter(mapperFactory)
            )
        );
        val failures = new ArrayList<String>();
        for (val manifest : manifests) {
            val problems = checker.problems(manifest.document());
            if (!problems.isEmpty()) {
                failures.add(manifest.file() + ": " + problems);
            }
        }
        assertEquals(List.of(), failures);
    }
}

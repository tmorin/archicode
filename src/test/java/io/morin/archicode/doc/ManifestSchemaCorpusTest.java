package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.cli.GetSchemasQuery;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * V3 of wave 022: the schema of {@code archicode query schemas manifest} against the loader, on the corpus of
 * {@link ManifestCorpus}. A file the repository ships and the loader reads conforms; a file the loader refuses for its shape is
 * refused by the schema; every other refusal is in {@code schemas/not-expressible.json} with the reason a schema cannot say it.
 */
@QuarkusTest
class ManifestSchemaCorpusTest {

    @Inject
    GetSchemasQuery query;

    @Inject
    MapperFactory mapperFactory;

    @TempDir
    Path dir;

    SchemaChecker checker;

    @BeforeEach
    void schema() {
        val writer = GetSchemasQuery.sortedWriter(mapperFactory);
        checker = new SchemaChecker((JsonNode) query.generateSchema(GetSchemasQuery.SchemaType.MANIFEST, writer));
    }

    @Test
    void everyManifestTheRepositoryShipsConforms() {
        val positives = ManifestCorpus.positives();
        assertTrue(positives.size() >= 400, "the repository ships at least 400 manifests: " + positives.size());
        val failures = new ArrayList<String>();
        for (val manifest : positives) {
            val problems = checker.problems(manifest.document());
            if (!problems.isEmpty()) {
                failures.add(manifest.origin() + "/" + manifest.file() + ": " + problems);
            }
        }
        assertEquals(List.of(), failures);
    }

    @Test
    @SneakyThrows
    void theCasesTheLoaderReadsConformAndTheStructuralOnesAreRefused() {
        val table = ManifestCorpus.notExpressible();
        val listedAndOther = new TreeSet<String>();
        val failures = new ArrayList<String>();
        var structural = 0;
        var loads = 0;
        var index = 0;
        for (val node : ManifestCorpus.caseNodes()) {
            val c = ManifestCorpus.altered(node, Files.createDirectory(dir.resolve("case" + index++)));
            switch (c.verdict()) {
                case LOADS -> {
                    loads++;
                    for (val manifest : c.manifests()) {
                        val problems = checker.problems(manifest.document());
                        if (!problems.isEmpty()) {
                            failures.add(c.id() + " loads but " + manifest.file() + " does not conform: " + problems);
                        }
                    }
                    if (table.containsKey(c.id())) {
                        failures.add(
                            c.id() + " loads, so it is not a limit of the schema: remove it from not-expressible.json"
                        );
                    }
                }
                case STRUCTURAL -> {
                    structural++;
                    if (checker.problems(ManifestCorpus.named(c)).isEmpty()) {
                        failures.add(c.id() + " is refused (" + c.error() + ") but the schema accepts " + c.named());
                    }
                    if (table.containsKey(c.id())) {
                        failures.add(
                            c.id() + " is structural, so the schema says it: remove it from not-expressible.json"
                        );
                    }
                }
                case OTHER -> {
                    listedAndOther.add(c.id());
                    if (!table.containsKey(c.id())) {
                        failures.add(
                            c.id() + " is refused for a reason the schema does not say and is not listed: " + c.error()
                        );
                    }
                }
            }
        }
        for (val listed : table.keySet()) {
            if (!listedAndOther.contains(listed)) {
                failures.add(listed + " is listed in not-expressible.json but is not a refusal of another kind");
            }
        }
        assertEquals(List.of(), failures);
        assertTrue(structural >= 25, "the corpus holds at least 25 structural negatives: " + structural);
        assertTrue(loads >= 10, "and at least 10 cases that load: " + loads);
    }

    @Test
    @SneakyThrows
    void theTableOfWhatTheSchemaCannotSayIsWellFormed() {
        val file = ManifestCorpus.class.getResource("/schemas/not-expressible.json");
        val limits = new com.fasterxml.jackson.databind.ObjectMapper().readTree(file).get("limits");
        val ids = new TreeSet<String>();
        for (val limit : limits) {
            assertTrue(ids.add(limit.get("id").asText()), "an id once: " + limit.get("id"));
            assertFalse(limit.get("what").asText().isBlank(), limit.get("id") + " says what");
            assertFalse(limit.get("reason").asText().isBlank(), limit.get("id") + " says why");
            assertTrue(limit.get("cases").isArray(), limit.get("id") + " lists its cases");
        }
        assertTrue(limits.size() >= 8);
    }

    @Test
    void theCheckerRefusesWhatTheSchemaForbids() {
        val mapper = new MapperFactory().create(io.morin.archicode.MapperFormat.YAML);
        val ok = "header: {kind: archicode.morin.io/person, version: '1'}\ncontent: {id: bob, name: Bob}\n";
        assertEquals(List.of(), checker.problems(parse(mapper, ok)));
        for (val bad : List.of(
            "header: {kind: archicode.morin.io/person, version: '1'}\ncontent: {name: Bob}\n",
            "header: {kind: archicode.morin.io/person, version: '1'}\ncontent: {id: a.b}\n",
            "header: {kind: archicode.morin.io/person, version: '1'}\ncontent: {id: bob, elements: []}\n",
            "header: {kind: archicode.morin.io/system, version: '1'}\ncontent: {id: s, elements: [{id: c}]}\n",
            "header: {kind: archicode.morin.io/system, version: '1'}\ncontent: {id: s, elements: [{kind: person, id: c}]}\n",
            "header: {kind: archicode.morin.io/plateau, version: '1'}\ncontent: {id: Bad Id}\n",
            "header: {kind: archicode.morin.io/person, version: '1', plateau: 'a.b'}\ncontent: {id: bob}\n",
            "header: {kind: archicode.morin.io/person}\ncontent: {id: bob}\n"
        )) {
            assertFalse(checker.problems(parse(mapper, bad)).isEmpty(), bad);
        }
    }

    @SneakyThrows
    private static JsonNode parse(com.fasterxml.jackson.databind.ObjectMapper mapper, String text) {
        return mapper.readTree(text);
    }
}

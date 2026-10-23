package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * {@code archicode query schemas} by the packaged application (wave 022, run 0158, V5): the jar under the JVM and the native
 * runner under {@code -Dnative} print the same schemas, byte for byte, as the golden files of {@code src/test/resources/schemas}.
 * The manifest schema is generated from the classes at run time, by reflection on them and on their annotations, which is what a
 * native image only does for what is registered: this is the check that it is.
 */
@QuarkusMainIntegrationTest
class SchemasIT {

    private static final Path GOLDEN = Path.of("src/test/resources/schemas");

    @SneakyThrows
    private static String golden(String name) {
        return Files.readString(GOLDEN.resolve(name)).strip();
    }

    @Test
    void theManifestSchemaIsTheGoldenFile(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("query", "schemas", "manifest"));
        assertEquals(golden("manifest.schema.json"), payload(result).strip(), () -> said(result));
    }

    @Test
    void theWorkspaceSchemaIsTheOneOfTheLastRelease(QuarkusMainLauncher launcher) {
        val result = succeeded(launcher.launch("query", "schemas", "workspace"));
        assertEquals(golden("workspace.schema.json"), payload(result).strip(), () -> said(result));
        val defaulted = succeeded(launcher.launch("query", "schemas"));
        assertEquals(payload(result), payload(defaulted), "the workspace is the default");
    }

    @Test
    void theManifestSchemaIsTheSameOnEveryRun(QuarkusMainLauncher launcher) {
        val first = payload(succeeded(launcher.launch("query", "schemas", "manifest")));
        for (int i = 0; i < 2; i++) {
            assertEquals(first, payload(succeeded(launcher.launch("query", "schemas", "manifest"))));
        }
        assertTrue(first.contains("\"kinds\""), "it describes the kinds");
    }
}

package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.EXAMPLES;
import static io.morin.archicode.it.Shipped.succeeded;
import static io.morin.archicode.it.Shipped.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * A manifest written in TOML (the TOML twin of {@code manifests/user.yaml} of {@code domain_workspace}, written here: the
 * editor does not read TOML, so no TOML manifest is shipped) gives the model of its YAML twin, in the packaged application.
 */
@QuarkusMainIntegrationTest
class TomlManifestIT {

    private static final String USER_IN_TOML = """
    [header]
    kind = "archicode.morin.io/person"
    version = "1"

    [content]
    id = "User"

    [[content.relationships]]
    destination = "ArchiCode.CommandLineInterface"
    qualifiers = ["Console"]
    """;

    @TempDir
    Path dir;

    @SneakyThrows
    @Test
    void aTomlManifestGivesTheGraphOfItsYamlTwin(QuarkusMainLauncher launcher) {
        val yaml = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "yaml");
        val toml = Shipped.copy(EXAMPLES.resolve("domain_workspace"), dir, "toml");
        Files.delete(toml.resolve("manifests/user.yaml"));
        Files.writeString(toml.resolve("manifests/user.toml"), USER_IN_TOML);

        val fromYaml = Shipped.payload(succeeded(launcher.launch("-w", workspace(yaml), "query", "graph")));
        val fromToml = Shipped.payload(succeeded(launcher.launch("-w", workspace(toml), "query", "graph")));

        assertTrue(
            fromToml.contains("\"reference\":\"User\""),
            () -> "the person of the TOML manifest is not in the graph\n" + fromToml
        );
        assertEquals(fromYaml, fromToml);
    }
}

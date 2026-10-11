package io.morin.archicode;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * Jackson reaches the model (workspace, manifests, indexes) and the results the queries print by reflection, which a
 * native image only allows for what is registered. This keeps the registration complete: a class added and not listed
 * there makes the commands fail in the native runner, and nowhere else.
 */
class NativeReflectionConfigTest {

    private static final Path CLASSES = Path.of("target", "classes");
    private static final Path CONFIG = Path.of(
        "src",
        "main",
        "resources",
        "META-INF",
        "native-image",
        "io.morin.archicode",
        "archicode",
        "reflect-config.json"
    );

    @Test
    void everyClassOfTheModelIsRegisteredForReflection() throws IOException {
        val registered = new HashSet<String>();
        for (JsonNode entry : new ObjectMapper().readTree(CONFIG.toFile())) {
            registered.add(entry.get("name").asText());
        }

        final Set<String> missing;
        try (var files = Files.walk(CLASSES.resolve("io/morin/archicode"))) {
            missing = files
                .map(path -> CLASSES.relativize(path).toString())
                .filter(name -> name.endsWith(".class"))
                .map(name -> name.substring(0, name.length() - ".class".length()).replace('/', '.'))
                .filter(name -> !registered.contains(name))
                .collect(Collectors.toCollection(TreeSet::new));
        }

        Assertions.assertTrue(
            missing.isEmpty(),
            "Add these classes to " + CONFIG + " (allDeclared* and allPublic* members): " + missing
        );
    }
}

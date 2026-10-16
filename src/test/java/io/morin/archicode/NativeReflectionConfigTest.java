package io.morin.archicode;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchema;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;
import java.util.jar.JarFile;
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
    void theResourcesLoadedAtRunTimeAreIncludedInTheNativeImage() throws IOException {
        val properties = new Properties();
        try (val reader = Files.newBufferedReader(Path.of("src", "main", "resources", "application.properties"))) {
            properties.load(reader);
        }
        val matchers = Arrays.stream(properties.getProperty("quarkus.native.resources.includes").split(","))
            .map(pattern -> FileSystems.getDefault().getPathMatcher("glob:" + pattern.trim()))
            .toList();

        final List<String> resources;
        try (var files = Files.walk(CLASSES)) {
            resources = files
                .map(path -> CLASSES.relativize(path).toString().replace('\\', '/'))
                .filter(name -> name.endsWith("ViewpointKernelModule.meta") || name.startsWith("editor-webapp/"))
                .toList();
        }
        Assertions.assertTrue(resources.stream().anyMatch(n -> n.endsWith(".meta")), "the kernel's metadata is built");
        Assertions.assertTrue(resources.contains("editor-webapp/standalone.html"), "the editor is built");
        for (val resource : resources) {
            Assertions.assertTrue(
                matchers.stream().anyMatch(m -> m.matches(Path.of(resource))),
                resource + " must be in quarkus.native.resources.includes"
            );
        }
    }

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

    /**
     * {@code query schemas} writes the schema with the JSON-Schema module of Jackson, which creates its own classes by
     * reflection (the type id resolver of {@code JsonSchema} needs a constructor, the schema types are written through
     * their getters). They belong to a dependency, so the test above does not see them.
     */
    @Test
    void everyClassOfTheJsonSchemaModuleIsRegisteredForReflection() throws IOException, URISyntaxException {
        val registered = new HashSet<String>();
        for (JsonNode entry : new ObjectMapper().readTree(CONFIG.toFile())) {
            registered.add(entry.get("name").asText());
        }

        val jar = Path.of(JsonSchema.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        final Set<String> missing;
        try (val file = new JarFile(jar.toFile())) {
            missing = file
                .stream()
                .map(entry -> entry.getName())
                .filter(name -> name.startsWith("com/") && name.endsWith(".class"))
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

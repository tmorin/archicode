package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * {@code archicode views generate --properties-content}, {@code --properties-format} and {@code --properties-path}: the
 * properties that every view the command makes of an element is given, in JSON, YAML or TOML, from the command line or a
 * file next to the workspace. The workspace is the one {@code archicode init} writes; the properties name another element
 * than the one each built-in view is about, which shows in the diagram that is drawn.
 */
@QuarkusTest
class GenerateViewsPropertiesTest {

    /** The diagram of the overview of the system {@code shop}: the person uses the system. */
    private static final String ABOUT_THE_SYSTEM = "customer --> shop : uses";

    /** The diagram of the overview of the container {@code shop.web}: the person uses the container. */
    private static final String ABOUT_THE_CONTAINER = "customer --> shop.web : uses";

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    Path workspace;

    @BeforeEach
    void init() {
        workspace = dir.resolve(".archicode.yaml");
        val init = CliHarness.run(factory, errorOutput, "init", dir.toString());
        assertEquals(0, init.exit(), init.err());
    }

    private CliHarness.Result generate(String... more) {
        val args = new java.util.ArrayList<>(
            java.util.List.of("-w", workspace.toString(), "views", "generate", "-i", "shop-overview")
        );
        args.addAll(java.util.List.of(more));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    @SneakyThrows
    private String drawn() {
        return Files.readString(dir.resolve("views/plantuml/application/shop-overview.puml"));
    }

    @Test
    void withoutPropertiesTheViewIsAboutItsOwnElement() {
        assertEquals(0, generate().exit());
        assertTrue(drawn().contains(ABOUT_THE_SYSTEM), drawn());
        assertFalse(drawn().contains(ABOUT_THE_CONTAINER));
    }

    @Test
    void propertiesGivenAsJsonOnTheCommandLineAreMergedIntoTheView() {
        val result = generate("--properties-content", "{\"element\":\"shop.web\"}");
        assertEquals(0, result.exit(), result.err());
        assertTrue(drawn().contains(ABOUT_THE_CONTAINER), drawn());
        assertFalse(drawn().contains(ABOUT_THE_SYSTEM));
    }

    @Test
    void propertiesGivenAsYamlNeedTheirFormat() {
        val result = generate("--properties-format", "yaml", "--properties-content", "element: shop.web");
        assertEquals(0, result.exit(), result.err());
        assertTrue(drawn().contains(ABOUT_THE_CONTAINER), drawn());
    }

    @Test
    void propertiesGivenAsTomlNeedTheirFormat() {
        val result = generate("--properties-format", "toml", "--properties-content", "element = \"shop.web\"");
        assertEquals(0, result.exit(), result.err());
        assertTrue(drawn().contains(ABOUT_THE_CONTAINER), drawn());
    }

    @Test
    @SneakyThrows
    void propertiesGivenAsAFileAreReadFromTheFolderOfTheWorkspace() {
        Files.writeString(dir.resolve("props.yaml"), "element: shop.web\n");
        val relative = generate("--properties-path", "props.yaml");
        assertEquals(0, relative.exit(), relative.err());
        assertTrue(drawn().contains(ABOUT_THE_CONTAINER), drawn());

        Files.delete(dir.resolve("views/plantuml/application/shop-overview.puml"));
        Files.writeString(dir.resolve("props.json"), "{\"element\": \"shop.web\"}");
        val absolute = generate("-p", dir.resolve("props.json").toString());
        assertEquals(0, absolute.exit(), absolute.err());
        assertTrue(drawn().contains(ABOUT_THE_CONTAINER), drawn());
    }

    @Test
    @SneakyThrows
    void theFileWinsOverTheContentWhenBothAreGiven() {
        Files.writeString(dir.resolve("props.json"), "{\"element\": \"shop.web\"}");
        val result = generate("-p", "props.json", "--properties-content", "{\"element\":\"shop\"}");
        assertEquals(0, result.exit(), result.err());
        assertTrue(drawn().contains(ABOUT_THE_CONTAINER), drawn());
    }

    @Test
    void emptyPropertiesAreNoProperties() {
        val result = generate("--properties-content", "");
        assertEquals(0, result.exit(), result.err());
        assertTrue(drawn().contains(ABOUT_THE_SYSTEM), drawn());
    }

    @Test
    void propertiesThatAreNotValidAreOneErrorLine() {
        val result = generate("--properties-content", "[1");
        assertEquals(1, result.exit(), result.err());
        assertTrue(result.err().startsWith("error: a file is not valid: "), result.err());
        assertEquals(1, result.err().strip().lines().count(), result.err());
    }
}

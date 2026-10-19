package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.workspace.Workspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * A manifest written in TOML is a manifest (issue #84): {@code ManifestParser} reads the content, which it turns into JSON
 * text, with a JSON mapper, whatever the format of the file. The TOML twin of a YAML manifest is made here from the
 * manifests the repository ships (the manual's examples and the fixtures), and gives the same model.
 *
 * <p>The editor does not read TOML (it counts the {@code .toml} files it finds as files it does not read, see
 * {@code discovery-cases.json}, case D36, and {@code ui-fixes.test.js}), so no TOML manifest is shipped to the users of the
 * repository: the twins live in the temporary folder of these tests, and every kind of manifest the shipped examples use
 * is one of them.
 */
@QuarkusTest
class TomlManifestTest {

    private static final List<String> ROOTS = List.of("src/doc/examples", "src/test/resources");

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @TempDir
    Path dir;

    /** Every {@code workspace.yaml} under the roots, sorted. */
    @SneakyThrows
    private static List<Path> workspaces() {
        val found = new ArrayList<Path>();
        for (val root : ROOTS) {
            try (val files = Files.walk(Path.of(root))) {
                files.filter(f -> f.getFileName().toString().equals("workspace.yaml")).forEach(found::add);
            }
        }
        return found.stream().sorted().toList();
    }

    /** A manifest has a header and a content; the workspace file and the other YAML files do not. */
    private boolean isManifest(Path file) {
        val name = file.getFileName().toString();
        if (!(name.endsWith(".yaml") || name.endsWith(".yml")) || name.equals("workspace.yaml")) {
            return false;
        }
        try {
            val tree = mapperFactory.create(MapperFormat.YAML).readTree(file.toFile());
            return tree != null && tree.path("header").isObject() && tree.path("content").isObject();
        } catch (IOException e) {
            return false; // a file that is not YAML is no manifest
        }
    }

    /** TOML has no null: a key with no value is a key that is absent. */
    private static JsonNode withoutNulls(JsonNode node) {
        if (node instanceof ObjectNode object) {
            val names = new ArrayList<String>();
            object.fieldNames().forEachRemaining(names::add);
            for (val name : names) {
                if (object.get(name).isNull()) {
                    object.remove(name);
                } else {
                    withoutNulls(object.get(name));
                }
            }
        } else if (node instanceof ArrayNode array) {
            array.forEach(TomlManifestTest::withoutNulls);
        }
        return node;
    }

    /** The TOML text of a YAML manifest. */
    @SneakyThrows
    private String tomlOf(Path yaml) {
        val tree = withoutNulls(mapperFactory.create(MapperFormat.YAML).readTree(yaml.toFile()));
        return mapperFactory.create(MapperFormat.TOML).writeValueAsString(tree);
    }

    /** A copy of a workspace folder in which every manifest is the TOML twin of the YAML one. */
    @SneakyThrows
    private Path twinOf(Path workspace, Path target) {
        val source = workspace.getParent();
        val files = new ArrayList<Path>();
        try (val walk = Files.walk(source)) {
            walk.filter(Files::isRegularFile).forEach(files::add);
        }
        for (val file : files) {
            val relative = source.relativize(file);
            if (relative.getName(0).toString().startsWith("views")) {
                continue; // the generated views are no input
            }
            Path to = target.resolve(relative.toString());
            Files.createDirectories(to.getParent());
            if (isManifest(file)) {
                val name = to.getFileName().toString();
                to = to.resolveSibling(name.substring(0, name.lastIndexOf('.')) + ".toml");
                Files.writeString(to, tomlOf(file));
            } else {
                Files.copy(file, to);
            }
        }
        return target.resolve("workspace.yaml");
    }

    /** What a loaded workspace is: its elements, its views and its stories, in the order of their references. */
    @SneakyThrows
    private String modelOf(Workspace workspace) {
        val mapper = mapperFactory.create(MapperFormat.JSON);
        val model = new TreeMap<String, Object>();
        model.put("application", new TreeMap<>(workspace.appIndex.elementByReferenceIndex));
        model.put("technology", new TreeMap<>(workspace.techIndex.elementByReferenceIndex));
        model.put("views", new TreeMap<>(workspace.viewIndex.viewByViewIdIndex));
        val stories = new ArrayList<String>();
        for (val story : workspace.getStories()) {
            stories.add(mapper.writeValueAsString(story));
        }
        Collections.sort(stories);
        model.put("stories", stories);
        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(model);
    }

    private List<String> plateausOf(Path workspace) {
        val tree = workspaceFactory.plateauTree(workspace);
        return tree.isLayered() ? new ArrayList<>(tree.ids()) : new ArrayList<>(Collections.singletonList(null));
    }

    @Test
    @SneakyThrows
    void shouldGiveTheSameModelFromTheTomlTwinOfEveryShippedWorkspace() {
        var compared = 0;
        var twins = 0;
        val skipped = new ArrayList<String>();
        val failures = new ArrayList<String>();
        for (val workspace : workspaces()) {
            val absolute = workspace.toAbsolutePath();
            final List<String> plateaus;
            final Map<String, String> expected = new TreeMap<>();
            try {
                plateaus = plateausOf(absolute);
                for (val plateau : plateaus) {
                    expected.put(String.valueOf(plateau), modelOf(workspaceFactory.create(absolute, null, plateau)));
                }
            } catch (RuntimeException e) {
                skipped.add(workspace.toString().replace('\\', '/')); // pinned by ShippedFilesTest
                continue;
            }
            val twin = twinOf(absolute, dir.resolve("twin-" + twins++));
            for (val plateau : plateaus) {
                try {
                    assertEquals(
                        expected.get(String.valueOf(plateau)),
                        modelOf(workspaceFactory.create(twin, null, plateau)),
                        workspace + " " + plateau
                    );
                    compared++;
                } catch (RuntimeException | AssertionError e) {
                    failures.add(workspace + " (plateau " + plateau + "): " + e.getMessage());
                }
            }
        }
        assertEquals(List.of(), failures);
        // the workspaces that are not read are those that are not meant to load (shipped-files/exceptions.json)
        val exceptions = new ArrayList<String>();
        mapperFactory
            .create(MapperFormat.JSON)
            .readTree(Path.of("src/test/resources/shipped-files/exceptions.json").toFile())
            .path("exceptions")
            .forEach(e -> exceptions.add(e.path("workspace").asText()));
        assertTrue(exceptions.containsAll(skipped), "skipped " + skipped + ", exceptions " + exceptions);
        assertTrue(compared >= 20, "the shipped workspaces give at least 20 (workspace, plateau) pairs: " + compared);
    }

    @SneakyThrows
    private List<Path> manifestsBelow(Path folder) {
        try (Stream<Path> walk = Files.walk(folder)) {
            return walk.filter(Files::isRegularFile).filter(this::isManifest).sorted().toList();
        }
    }

    @SneakyThrows
    private ManifestKind kindOf(Path yaml) {
        return mapperFactory.create(MapperFormat.YAML).readValue(yaml.toFile(), Manifest.class).getKind();
    }

    /**
     * The kinds no manifest of the repository uses: a view and a story are written in the manual (README.adoc, "Stories")
     * and the examples keep them in their workspace file, so these two have a sample of their own below. A shipped file that
     * starts to use one fails this test: the sample is then taken from the files.
     */
    private static final Map<ManifestKind, String> SAMPLES = Map.of(
        ManifestKind.VIEW,
        """
        header:
          kind: archicode.morin.io/view
          version: "1"
        content:
          id: shop_overview
          name: Shop - Overview
          viewpoint: overview
          layer: application
          properties:
            element: shop
            wrap: true
        """,
        ManifestKind.STORY,
        """
        header:
          kind: archicode.morin.io/story
          version: "1"
        content:
          id: order_flow
          name: How an order travels
          description: From the shop to the payment provider.
          steps:
            - view: shop_overview
              text: The shop receives the order.
            - viewpoint: overview
              layer: application
              properties:
                element: shop
              text: And pays.
        """
    );

    @Test
    void shouldFindEveryKindOfManifestInTheShippedFilesButTheOnesWithASample() {
        val used = EnumSet.noneOf(ManifestKind.class);
        for (val workspace : workspaces()) {
            for (val file : manifestsBelow(workspace.getParent())) {
                used.add(kindOf(file));
            }
        }
        val missing = EnumSet.complementOf(used);
        assertEquals(SAMPLES.keySet(), missing);
    }

    /** The item a manifest file holds, read the way the loader reads it (the file, then its content as JSON text). */
    @SneakyThrows
    private String itemOf(Path file) {
        val resource = mapperFactory.create(file).readValue(file.toFile(), Manifest.class);
        val item = ManifestConverter.builder()
            .manifest(resource)
            .mapper(mapperFactory.create(MapperFormat.JSON))
            .build()
            .convert();
        return mapperFactory.create(MapperFormat.JSON).writeValueAsString(item);
    }

    @ParameterizedTest
    @EnumSource(ManifestKind.class)
    @SneakyThrows
    void shouldReadTheTomlTwinOfEveryManifestOfThisKindAsTheYamlOne(ManifestKind kind) {
        val yamls = new ArrayList<Path>();
        for (val workspace : workspaces()) {
            for (val yaml : manifestsBelow(workspace.getParent())) {
                if (kindOf(yaml) == kind) {
                    yamls.add(yaml);
                }
            }
        }
        if (SAMPLES.containsKey(kind)) {
            val sample = dir.resolve(kind.name() + "-sample.yaml");
            Files.writeString(sample, SAMPLES.get(kind));
            yamls.add(sample);
        }
        assertFalse(yamls.isEmpty(), "a manifest of kind " + kind);
        var compared = 0;
        for (val yaml : yamls) {
            val toml = dir.resolve(kind.name() + "-" + compared++ + ".toml");
            Files.writeString(toml, tomlOf(yaml));
            assertEquals(itemOf(yaml), itemOf(toml), yaml.toString());
        }
    }

    @Test
    @SneakyThrows
    void shouldGiveTheSameModelFromTheTomlTwinOfAViewAndAStory() {
        val models = new ArrayList<String>();
        for (val format : List.of("yaml", "toml")) {
            val folder = Files.createDirectories(dir.resolve("views-and-stories-" + format));
            Files.writeString(
                folder.resolve("workspace.yaml"),
                "settings:\n  manifests:\n    paths: [\"manifests\"]\n"
            );
            Files.createDirectories(folder.resolve("manifests"));
            Files.writeString(
                folder.resolve("manifests/shop." + format),
                format.equals("yaml") ? SHOP_YAML : tomlOfText(SHOP_YAML)
            );
            for (val kind : SAMPLES.keySet()) {
                val text = SAMPLES.get(kind);
                Files.writeString(
                    folder.resolve("manifests/" + kind.name().toLowerCase() + "." + format),
                    format.equals("yaml") ? text : tomlOfText(text)
                );
            }
            models.add(modelOf(workspaceFactory.create(folder.resolve("workspace.yaml"))));
        }
        assertEquals(models.get(0), models.get(1));
        assertTrue(models.get(0).contains("shop_overview") && models.get(0).contains("order_flow"), models.get(0));
    }

    private static final String SHOP_YAML = """
    header:
      kind: archicode.morin.io/system
      version: "1"
    content:
      id: shop
      name: Shop
    """;

    @SneakyThrows
    private String tomlOfText(String yaml) {
        val tree = withoutNulls(mapperFactory.create(MapperFormat.YAML).readTree(yaml));
        return mapperFactory.create(MapperFormat.TOML).writeValueAsString(tree);
    }

    @Test
    @SneakyThrows
    void shouldKeepTheNestedElementsOfATomlManifest() {
        // TOML writes the nested elements as arrays of tables: a system with a container with a component
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"manifests\"]\n");
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/shop.toml"),
            """
            [header]
            kind = "archicode.morin.io/system"
            version = "1"

            [content]
            id = "shop"
            name = "Shop"

            [[content.elements]]
            kind = "container"
            id = "web"
            name = "Web"

            [[content.elements.elements]]
            kind = "component"
            id = "cart"

            [[content.relationships]]
            destination = "shop.web"
            label = "uses"
            """
        );
        val workspace = workspaceFactory.create(dir.resolve("workspace.yaml"));
        assertEquals(
            List.of("shop", "shop.web", "shop.web.cart"),
            workspace.appIndex.elementByReferenceIndex.keySet().stream().sorted().toList()
        );
    }

    @Test
    @SneakyThrows
    void shouldTellAWrongTomlFileInOneLine() {
        // a TOML file that is not TOML is a manifest that is not valid, with the name of the file, as for the other formats
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"manifests\"]\n");
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/broken.toml"), "[header\nkind = \n");
        val message = assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(dir.resolve("workspace.yaml"))
        ).getMessage();
        assertTrue(message.startsWith("`manifests/broken.toml` is not valid: "), message);
        assertFalse(message.contains("\n"), message);
    }

    @Test
    @SneakyThrows
    void shouldTellAFaultOfTheContentOfATomlManifestAsOfTheYamlOne() {
        // the second read: the content, as JSON text, has a key nobody knows; the sentence is the one of the YAML manifest
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"manifests\"]\n");
        Files.createDirectories(dir.resolve("manifests"));
        val sentences = new ArrayList<String>();
        for (val format : List.of("yaml", "toml")) {
            val yaml =
                "header:\n  kind: archicode.morin.io/system\n  version: \"1\"\ncontent:\n  id: s\n  colour: red\n";
            Files.writeString(dir.resolve("manifests/s." + format), format.equals("yaml") ? yaml : tomlOfText(yaml));
            val message = assertThrows(ArchiCodeException.class, () ->
                workspaceFactory.create(dir.resolve("workspace.yaml"))
            ).getMessage();
            sentences.add(message.replace("s." + format, "s.EXT"));
            Files.delete(dir.resolve("manifests/s." + format));
        }
        assertEquals(sentences.get(0), sentences.get(1));
        assertTrue(
            sentences.get(1).startsWith("`manifests/s.EXT` is not valid: unknown key `colour`"),
            sentences.get(1)
        );
    }

    @Test
    @SneakyThrows
    void shouldRefuseAKindThatDoesNotExistInATomlManifestAsInAYamlOne() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"manifests\"]\n");
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/g.toml"),
            "[header]\nkind = \"archicode.morin.io/system-group\"\nversion = \"1\"\n[content]\nid = \"g\"\n"
        );
        val message = assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(dir.resolve("workspace.yaml"))
        ).getMessage();
        assertTrue(message.startsWith("`manifests/g.toml` is not valid: unrecognized `header.kind` "), message);
    }
}

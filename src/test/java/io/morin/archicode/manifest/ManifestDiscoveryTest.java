package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.cli.ArchiCode;
import io.morin.archicode.cli.ErrorOutput;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * Where the manifests are (run 0076, issue #73): an entry of {@code settings.manifests.paths} that ends in {@code /**} is
 * read recursively, sorted, without the folders of the generated views; an entry without it reads what it always read.
 * The cases are in {@code discovery-cases.json}, which the editor runs too ({@code discovery.test.js}): the two tools
 * find the same files in the same order and refuse the same paths with the same sentence.
 */
@QuarkusTest
class ManifestDiscoveryTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/discovery-cases.json");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private static JsonNode document() {
        return JSON.readTree(Files.readString(CASES));
    }

    static Stream<String> caseIds() {
        val ids = new ArrayList<String>();
        document()
            .get("cases")
            .forEach(c -> ids.add(c.get("id").asText()));
        return ids.stream();
    }

    @SneakyThrows
    private static String manifestOf(String path, String id) {
        val kind = "archicode.morin.io/system";
        if (path.endsWith(".json")) {
            return "{\"header\":{\"kind\":\"%s\",\"version\":\"1\"},\"content\":{\"id\":\"%s\",\"name\":\"%s\"}}\n".formatted(
                kind,
                id,
                id
            );
        }
        if (path.endsWith(".toml")) {
            return "[header]\nkind = \"%s\"\nversion = \"1\"\n[content]\nid = \"%s\"\nname = \"%s\"\n".formatted(
                kind,
                id,
                id
            );
        }
        return "header:\n  kind: \"%s\"\n  version: \"1\"\ncontent:\n  id: \"%s\"\n  name: \"%s\"\n".formatted(
            kind,
            id,
            id
        );
    }

    /** The folder of a case: workspace.yaml, the files, the empty folders and the links. */
    @SneakyThrows
    private void build(JsonNode c) {
        val settings = new StringBuilder("settings:\n  manifests:\n    paths: ")
            .append(c.get("paths").toString())
            .append("\n");
        if (c.has("views")) {
            settings
                .append("  views:\n    path: ")
                .append(JSON.writeValueAsString(c.get("views").asText()))
                .append("\n");
        }
        Files.writeString(dir.resolve("workspace.yaml"), settings.toString());
        val files = c.get("files").properties();
        for (val file : files) {
            val target = dir.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            if (file.getValue().isObject()) {
                Files.writeString(target, file.getValue().get("raw").asText());
            } else {
                Files.writeString(target, manifestOf(file.getKey(), file.getValue().asText()));
            }
        }
        for (val empty : c.path("empty_dirs")) {
            Files.createDirectories(dir.resolve(empty.asText()));
        }
        for (val link : c.path("links").properties()) {
            Files.createDirectories(dir.resolve(link.getKey()).getParent());
            Files.createSymbolicLink(dir.resolve(link.getKey()), dir.resolve(link.getValue().asText()));
        }
    }

    private static String sentence(String template) {
        val tails = document().get("tails");
        return template
            .replace("${pattern}", tails.get("pattern").asText())
            .replace("${below}", tails.get("below").asText());
    }

    private static List<String> paths(JsonNode c) {
        val paths = new ArrayList<String>();
        c.get("paths").forEach(p -> paths.add(p.asText()));
        return paths;
    }

    private static JsonNode caseOf(String id) {
        for (val candidate : document().get("cases")) {
            if (candidate.get("id").asText().equals(id)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("no case " + id);
    }

    @ParameterizedTest
    @MethodSource("caseIds")
    void shouldRunTheCaseTheEditorRunsToo(String id) {
        val c = caseOf(id);
        build(c);
        val workspace = dir.resolve("workspace.yaml");
        val expect = c.get("expect");
        if (expect.has("error")) {
            val message = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(workspace)).getMessage();
            assertEquals(sentence(expect.get("error").asText()), message);
        } else if (expect.has("refused_file")) {
            val message = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(workspace)).getMessage();
            assertTrue(
                message.startsWith("`" + expect.get("refused_file").asText() + "` is not valid"),
                "the message names the file: " + message
            );
        } else {
            val read = new ArrayList<String>();
            ManifestDiscovery.discover(
                dir,
                paths(c),
                c.has("views") ? c.get("views").asText() : "views",
                workspace
            ).forEach(file -> read.add(ManifestParser.sourceOf(dir, file)));
            val expected = new ArrayList<String>();
            expect.get("read").forEach(file -> expected.add(file.asText()));
            assertEquals(expected, read, c.get("what").asText());
            // and the loader gets the elements of those files, nothing more
            val loaded = workspaceFactory.create(workspace);
            val ids = new TreeSet<String>();
            expect.get("read").forEach(file -> ids.add(c.get("files").get(file.asText()).asText()));
            assertEquals(ids, new TreeSet<>(loaded.appIndex.elementByReferenceIndex.keySet()));
        }
    }

    @Test
    @SneakyThrows
    void shouldKeepTheViewsFolderOfTheWorkspaceWhenTheOutputOptionNamesAnother() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"./**\"]\n");
        Files.createDirectories(dir.resolve("views-to-be"));
        Files.writeString(dir.resolve("views-to-be/gap.json"), "{\"gap\": true}\n");
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/a.yaml"), manifestOf("a.yaml", "a"));
        val loaded = workspaceFactory.create(dir.resolve("workspace.yaml"), Path.of("elsewhere"), null);
        assertEquals(Set.of("a"), loaded.appIndex.elementByReferenceIndex.keySet());
    }

    @Test
    @SneakyThrows
    void shouldReadALinkToAFileLikeTheFile() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"manifests/**\"]\n");
        Files.createDirectories(dir.resolve("manifests"));
        Files.createDirectories(dir.resolve("shared"));
        Files.writeString(dir.resolve("shared/real.yaml"), manifestOf("real.yaml", "real"));
        Files.createSymbolicLink(dir.resolve("manifests/alias.yaml"), dir.resolve("shared/real.yaml"));
        val read = new ArrayList<String>();
        ManifestDiscovery.discover(dir, List.of("manifests/**"), "views", dir.resolve("workspace.yaml")).forEach(file ->
            read.add(ManifestParser.sourceOf(dir, file))
        );
        assertEquals(List.of("manifests/alias.yaml"), read);
    }

    @Test
    @SneakyThrows
    void shouldFollowTheLinkThatIsTheFolderOfAPathAndNotTheOnesFoundBelowIt() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        Files.createDirectories(dir.resolve("shared"));
        Files.writeString(dir.resolve("shared/s.yaml"), manifestOf("s.yaml", "s"));
        Files.createSymbolicLink(dir.resolve("manifests"), dir.resolve("shared"));
        val read = new ArrayList<String>();
        ManifestDiscovery.discover(dir, List.of("manifests/**"), "views", null).forEach(file ->
            read.add(ManifestParser.sourceOf(dir, file))
        );
        assertEquals(List.of("manifests/s.yaml"), read, "a path that names a link to a folder is read, as without /**");
    }

    @Test
    @SneakyThrows
    void shouldNameAFolderItCannotReadByItsPathFromTheWorkspace() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        val locked = dir.resolve("manifests/locked");
        Files.createDirectories(locked);
        Files.writeString(dir.resolve("manifests/a.yaml"), manifestOf("a.yaml", "a"));
        if (!locked.toFile().setReadable(false) || Files.isReadable(locked)) {
            return; // the file system does not refuse (a superuser)
        }
        try {
            val message = assertThrows(ArchiCodeException.class, () ->
                ManifestDiscovery.discover(dir, List.of("manifests/**"), "views", null)
            ).getMessage();
            assertEquals("unable to read the path manifests/locked", message);
        } finally {
            locked.toFile().setReadable(true);
        }
    }

    @Test
    @SneakyThrows
    void shouldFindTheFilesOfEveryFormatTheCommandLineReads() {
        Files.writeString(dir.resolve("workspace.yaml"), "settings: {}\n");
        Files.createDirectories(dir.resolve("manifests/sub"));
        for (val name : List.of("a.yaml", "b.yml", "c.json", "sub/d.toml", "e.YAML", "f.txt")) {
            Files.writeString(dir.resolve("manifests").resolve(name), "x\n");
        }
        val read = new ArrayList<String>();
        ManifestDiscovery.discover(dir, List.of("manifests/**"), "views", null).forEach(file ->
            read.add(ManifestParser.sourceOf(dir, file))
        );
        assertEquals(List.of("manifests/a.yaml", "manifests/b.yml", "manifests/c.json", "manifests/sub/d.toml"), read);
    }

    @Test
    void shouldReadTheExampleOfTheManualFromItsFoldersInOrder() {
        val example = Path.of("src/doc/examples/domain_manifest_folders");
        val read = new ArrayList<String>();
        ManifestDiscovery.discover(
            example,
            List.of("manifests/**"),
            "views",
            example.resolve("workspace.yaml")
        ).forEach(file -> read.add(ManifestParser.sourceOf(example, file)));
        assertEquals(
            List.of(
                "manifests/application/shop.yaml",
                "manifests/application/shop/warehouse.yaml",
                "manifests/people/customer.yaml",
                "manifests/technology/reference.yaml",
                "manifests/technology/reference/server.yaml"
            ),
            read
        );
        val loaded = workspaceFactory.create(example.resolve("workspace.yaml"));
        assertEquals(
            Set.of("customer", "shop", "shop.web", "shop.warehouse"),
            loaded.appIndex.elementByReferenceIndex.keySet()
        );
        assertEquals(Set.of("reference", "reference.server"), loaded.techIndex.elementByReferenceIndex.keySet());
    }

    private int run(String... args) {
        val commandLine = new CommandLine(ArchiCode.class, factory);
        errorOutput.install(commandLine);
        return commandLine.execute(args);
    }

    @Test
    @SneakyThrows
    void shouldGenerateTheViewsTwiceFromAFolderThatHoldsTheViewsOfTheFirstRun() {
        // the reason for leaving the folders of the views out: `./**` reads the folder of the workspace, where the first run wrote its views
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  manifests:\n    paths: [\"./**\"]\n");
        Files.createDirectories(dir.resolve("domain/shop"));
        Files.writeString(dir.resolve("domain/shop/shop.yaml"), manifestOf("shop.yaml", "shop"));
        assertEquals(0, run("-w", dir.resolve("workspace.yaml").toString(), "views", "generate"));
        assertTrue(Files.isDirectory(dir.resolve("views")), "the first run wrote its views next to workspace.yaml");
        Files.writeString(dir.resolve("views/gap.json"), "{\"gap\": true}\n");
        Files.createDirectories(dir.resolve("views-to-be-vs-as-is"));
        Files.writeString(dir.resolve("views-to-be-vs-as-is/gap.json"), "{\"gap\": true}\n");
        assertEquals(0, run("-w", dir.resolve("workspace.yaml").toString(), "views", "generate"));
    }

    @Test
    @SneakyThrows
    void shouldTellAMalformedPathInOneLineWithoutAStackTrace() {
        Files.writeString(
            dir.resolve("workspace.yaml"),
            "settings:\n  manifests:\n    paths: [\"manifests/**/sub\"]\n"
        );
        val err = new java.io.ByteArrayOutputStream();
        val commandLine = new CommandLine(ArchiCode.class, factory);
        commandLine.setErr(new java.io.PrintWriter(err, true, java.nio.charset.StandardCharsets.UTF_8));
        errorOutput.install(commandLine);
        assertEquals(1, commandLine.execute("-w", dir.resolve("workspace.yaml").toString(), "views", "generate"));
        val lines = err.toString(java.nio.charset.StandardCharsets.UTF_8).strip().lines().toList();
        assertEquals(1, lines.size(), lines.toString());
        assertTrue(
            lines.get(0).startsWith("error: the path `manifests/**/sub` of `settings.manifests.paths` uses `**`"),
            lines.get(0)
        );
    }

    @Test
    void shouldCompareByCodePointAndNotByUtf16Unit() {
        assertTrue(ManifestDiscovery.compare("～", "😀") < 0, "U+FF5E comes before U+1F600");
        assertTrue("～".compareTo("😀") > 0, "the UTF-16 order is the other way round");
        assertEquals(0, ManifestDiscovery.compare("a/b", "a/b"));
        assertTrue(ManifestDiscovery.compare("a", "a/b") < 0);
        assertTrue(ManifestDiscovery.compare("B", "a") < 0);
    }

    @Test
    void shouldTellWhatEndsAPathThatIsReadRecursively() {
        assertTrue(ManifestDiscovery.isRecursive("manifests/**"));
        assertTrue(ManifestDiscovery.isRecursive("./**"));
        assertEquals("manifests", ManifestDiscovery.folderOf("manifests/**"));
        assertEquals("manifests", ManifestDiscovery.folderOf("manifests"));
        assertNull(ManifestDiscovery.patternProblem("manifests/**"));
        assertNull(ManifestDiscovery.patternProblem("./**"));
        assertNull(ManifestDiscovery.patternProblem("a*b/*"));
        assertTrue(ManifestDiscovery.patternProblem("**").startsWith("uses `**`"));
    }
}

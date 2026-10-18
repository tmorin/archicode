package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * Every workspace the repository ships, in the manual (src/doc/examples) or as a fixture (src/test/resources), is a
 * workspace the command line loads, plateau by plateau: a shipped file that does not load is told by this test, with the
 * reason, not found by opening it. A workspace that is not meant to load is listed, with its reason, in
 * {@code src/test/resources/shipped-files/exceptions.json}, which the editor's test ({@code shipped-files.test.js})
 * reads too. The file is the list: an entry that names no workspace, or a workspace that loads although it is listed,
 * fails.
 */
@QuarkusTest
class ShippedFilesTest {

    private static final List<String> ROOTS = List.of("src/doc/examples", "src/test/resources");
    private static final Path EXCEPTIONS = Path.of("src/test/resources/shipped-files/exceptions.json");

    @Inject
    WorkspaceFactory workspaceFactory;

    /** Every {@code workspace.yaml} under the roots, from the root of the repository, with {@code /}, sorted. */
    @SneakyThrows
    static List<String> workspaces() {
        val found = new ArrayList<String>();
        for (val root : ROOTS) {
            try (val files = Files.walk(Path.of(root))) {
                files
                    .filter(f -> f.getFileName().toString().equals("workspace.yaml"))
                    .forEach(f -> found.add(f.toString().replace('\\', '/')));
            }
        }
        return found.stream().sorted().toList();
    }

    /**
     * The workspace files the manual includes under another name (the steps of the design example, the defaults, the
     * parts of the configuration): each is a workspace file, or a part of one, and is loaded as the {@code workspace.yaml}
     * of an empty folder. Every YAML file of the manual that is neither a {@code workspace.yaml} nor in a manifests or
     * plateau folder.
     */
    @SneakyThrows
    static List<String> workspaceFilesUnderAnotherName() {
        val found = new ArrayList<String>();
        try (val files = Files.walk(Path.of("src/doc/examples"))) {
            files
                .filter(f -> f.getFileName().toString().endsWith(".yaml"))
                .map(f -> f.toString().replace('\\', '/'))
                .filter(f -> !f.endsWith("/workspace.yaml") && !f.contains("/manifests/") && !f.contains("/plateaus/"))
                .forEach(found::add);
        }
        return found.stream().sorted().toList();
    }

    /** The exceptions that apply to the command line: workspace -> reason. */
    @SneakyThrows
    static Map<String, String> exceptions() {
        val result = new TreeMap<String, String>();
        for (val entry : new ObjectMapper().readTree(EXCEPTIONS.toFile()).path("exceptions")) {
            val workspace = entry.path("workspace").asText();
            val reason = entry.path("reason").asText();
            assertFalse(workspace.isBlank(), "an exception names a workspace: " + entry);
            assertFalse(reason.isBlank(), "the exception for " + workspace + " has no reason");
            val tools = entry.path("tools").toString();
            assertTrue(
                List.of("[\"cli\"]", "[\"editor\"]", "[\"cli\",\"editor\"]").contains(tools),
                "the tools of the exception for " + workspace + " are `cli`, `editor` or both: " + tools
            );
            if (tools.contains("cli")) {
                result.put(workspace, reason);
            }
        }
        return result;
    }

    /**
     * The plateaus of a workspace, in the order of the tree (a plateau is then named with {@code --plateau}, since a tree that
     * forks has no default); none for a workspace that declares none.
     */
    private List<String> plateausOf(Path workspace) {
        val ids = new ArrayList<String>();
        try {
            val tree = workspaceFactory.plateauTree(workspace);
            if (tree.isLayered()) {
                ids.addAll(tree.ids());
            }
        } catch (RuntimeException e) {
            // a workspace the tree cannot be read of is loaded once, and tells why
        }
        return ids;
    }

    @Test
    void shouldFindTheWorkspacesOfTheRepository() {
        val found = workspaces();
        assertTrue(found.size() >= 17, "the manual and the fixtures ship at least 17 workspaces: " + found);
        assertTrue(found.contains("src/doc/examples/domain_plateaus/workspace.yaml"), found.toString());
        assertTrue(found.contains("src/test/resources/brightcart/layered/workspace.yaml"), found.toString());
    }

    @Test
    void shouldLoadEveryPlateauOfTheLayeredBrightcart() {
        // a layered workspace is read once per plateau of its tree, and the tree of Brightcart forks: the plateau is named
        val layered = Path.of("src/test/resources/brightcart/layered/workspace.yaml").toAbsolutePath();
        assertEquals(
            List.of("baseline", "inhouse", "marketplace", "saas"),
            plateausOf(layered).stream().sorted().toList()
        );
    }

    @Test
    void shouldNameOnlyWorkspacesThatExist() {
        val found = workspaces();
        val others = workspaceFilesUnderAnotherName();
        for (val workspace : exceptions().keySet()) {
            assertTrue(
                found.contains(workspace) || others.contains(workspace),
                "the exception names no workspace of the repository: " + workspace
            );
        }
    }

    @Test
    void shouldLoadEveryWorkspaceTheRepositoryShipsOnEveryPlateau() {
        val exceptions = exceptions();
        val failures = new ArrayList<String>();
        var loaded = 0;
        for (val workspace : workspaces()) {
            val path = Path.of(workspace).toAbsolutePath();
            // a workspace with plateaus is read once per plateau (`--plateau`), one without once
            val plateaus = new ArrayList<String>();
            plateausOf(path).forEach(plateaus::add);
            if (plateaus.isEmpty()) {
                plateaus.add(null);
            }
            var failure = (String) null;
            for (val plateau : plateaus) {
                try {
                    workspaceFactory.create(path, null, plateau);
                    loaded++;
                } catch (RuntimeException e) {
                    failure = (plateau == null ? "" : "plateau `" + plateau + "`: ") + e.getMessage();
                    break;
                }
            }
            if (exceptions.containsKey(workspace)) {
                if (failure == null) {
                    failures.add(
                        workspace + " is listed as an exception (" + exceptions.get(workspace) + ") but loads"
                    );
                }
            } else if (failure != null) {
                failures.add(workspace + " does not load: " + failure);
            }
        }
        assertEquals(List.of(), failures, "loaded " + loaded + " (workspace, plateau) pairs");
    }

    @Test
    @SneakyThrows
    void shouldLoadEveryWorkspaceFileOfTheManualUnderAnotherName(@org.junit.jupiter.api.io.TempDir Path dir) {
        val exceptions = exceptions();
        val files = workspaceFilesUnderAnotherName();
        assertTrue(files.size() >= 10, "the manual includes at least 10 such files: " + files);
        val failures = new ArrayList<String>();
        for (val file : files) {
            val folder = Files.createTempDirectory(dir, "ws");
            Files.copy(Path.of(file), folder.resolve("workspace.yaml"));
            String failure = null;
            try {
                workspaceFactory.create(folder.resolve("workspace.yaml"));
            } catch (RuntimeException e) {
                failure = e.getMessage();
            }
            if (exceptions.containsKey(file)) {
                if (failure == null) {
                    failures.add(file + " is listed as an exception (" + exceptions.get(file) + ") but loads");
                }
            } else if (failure != null) {
                failures.add(file + " does not load: " + failure);
            }
        }
        assertEquals(List.of(), failures);
    }

    @Test
    @SneakyThrows
    void shouldFailOnAWorkspaceWhoseManifestHasAnUnknownKey(@org.junit.jupiter.api.io.TempDir Path dir) {
        // the proof that the test above is not vacuous: a manifest of a shipped fixture with a key nobody knows
        val source = Path.of("src/test/resources/hyphen-ids");
        try (val files = Files.walk(source)) {
            for (val file : files.filter(Files::isRegularFile).toList()) {
                val target = dir.resolve(source.relativize(file).toString());
                Files.createDirectories(target.getParent());
                Files.copy(file, target);
            }
        }
        val manifest = Files.walk(dir)
            .filter(
                f ->
                    f.getFileName().toString().endsWith(".yaml") && !f.getFileName().toString().equals("workspace.yaml")
            )
            .sorted()
            .findFirst()
            .orElseThrow();
        Files.writeString(manifest, Files.readString(manifest).replaceFirst("version:", "unknown-key: x\n  version:"));
        val e = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(dir.resolve("workspace.yaml")));
        assertTrue(e.getMessage().contains("unknown key `unknown-key`"), e.getMessage());
    }
}

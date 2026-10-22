package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * A workspace that has no plateau is read as it always was (wave 014, run 0083): one set of manifests, no plateau drawn,
 * nothing of plateaus written back, and the rules it keeps from the days of the old key: a manifests path stays below the
 * folder of the workspace, and {@code settings.current} and {@code --plateau} name nothing.
 */
@QuarkusTest
class WorkspaceWithoutPlateausTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @TempDir
    Path dir;

    private static final String SHOP = """
    header:
      kind: "archicode.morin.io/system"
      version: "1"
    content:
      id: "shop"
      name: "Shop"
    """;

    @SneakyThrows
    private Path workspace(String text) {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/shop.yaml"), SHOP);
        return Files.writeString(dir.resolve(".archicode.yaml"), text);
    }

    private String messageOf(Path workspace, String plateau) {
        return assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(workspace, null, plateau)
        ).getMessage();
    }

    @Test
    void aWorkspaceWithoutPlateausIsReadAsItAlwaysWas() {
        val workspace = workspaceFactory.create(workspace("settings:\n  views:\n    path: out\n"));
        assertNull(workspace.getPlateau());
        assertNull(workspace.getPlateauTree());
        assertEquals(List.of("shop"), List.copyOf(workspace.appIndex.listAllElementReferences(e -> true)));
        // and writes nothing of plateaus when it is written again
        val tree = mapperFactory.create(MapperFormat.YAML).valueToTree(workspace.getSettings());
        assertTrue(!tree.has("plateaus") && !tree.has("current"));
    }

    @Test
    void aManifestsPathLeavingTheFolderOrAbsoluteIsRefusedAndTheMessageSaysWhatToChange() {
        for (val bad : List.of("../shared", "/srv/manifests", "a/../../b")) {
            val message = messageOf(
                workspace("settings:\n  manifests:\n    paths:\n      - manifests\n      - " + bad + "\n"),
                null
            );
            assertTrue(message.startsWith("the path `" + bad + "` of `settings.manifests.paths` "), message);
            assertTrue(message.contains("Move the folder below .archicode.yaml"), message);
            assertTrue(message.contains("change the path to match"), message);
        }
    }

    @Test
    void severalProblemsAreInOneMessageOnePerLine() {
        val message = messageOf(
            workspace("settings:\n  current: x\n  manifests:\n    paths:\n      - /srv/a\n      - ../b\n"),
            "y"
        );
        assertEquals(4, message.split("\n").length, message);
        assertTrue(message.contains("`settings.current` is `x` but the workspace declares no plateau"), message);
        assertTrue(message.contains("`--plateau y` cannot be used: the workspace declares no plateau"), message);
    }

    @Test
    void currentAndPlateauNameNothing() {
        val path = workspace("settings:\n  current: x\n");
        assertEquals(
            "`settings.current` is `x` but the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)",
            messageOf(path, null)
        );
    }
}

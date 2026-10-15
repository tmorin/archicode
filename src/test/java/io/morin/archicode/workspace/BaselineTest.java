package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The plateau a plateau is compared with: the one asked for, else the {@code baseline} it names, else the one before it
 * in the list, and none for the first plateau.
 */
@QuarkusTest
class BaselineTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private static String system(String id) {
        return """
        header:
          kind: "archicode.morin.io/system"
          version: "1"
        content:
          id: "%s"
        """.formatted(id);
    }

    /** Three plateaus; `plateaus` is what follows `settings:`. */
    @SneakyThrows
    private Path workspace(String plateaus) {
        for (val folder : new String[] { "a", "b", "c" }) {
            Files.createDirectories(dir.resolve("p/" + folder));
            Files.writeString(dir.resolve("p/" + folder + "/s.yaml"), system("s" + folder));
        }
        Files.writeString(dir.resolve("workspace.yaml"), "settings:\n  plateaus:\n" + plateaus);
        return dir.resolve("workspace.yaml");
    }

    private static final String PLAIN = """
        - id: a
          path: p/a
        - id: b
          path: p/b
        - id: c
          path: p/c
    """;

    private String baselineOf(Path workspace, String plateau, String requested) {
        val loaded = workspaceFactory.create(workspace, null, plateau);
        val baseline = Plateaus.baseline(loaded.getSettings(), loaded.getPlateau(), requested);
        return baseline == null ? null : baseline.getId();
    }

    @Test
    void theBaselineIsThePlateauBeforeInTheList() {
        val workspace = workspace(PLAIN);
        assertEquals("b", baselineOf(workspace, "c", null));
        assertEquals("a", baselineOf(workspace, "b", null));
    }

    @Test
    void theFirstPlateauHasNothingToBeComparedWith() {
        assertNull(baselineOf(workspace(PLAIN), "a", null));
    }

    @Test
    void theBaselineKeyOfAPlateauChangesIt() {
        val workspace = workspace(
            """
                - id: a
                  path: p/a
                - id: b
                  path: p/b
                - id: c
                  path: p/c
                  baseline: a
            """
        );
        assertEquals("a", baselineOf(workspace, "c", null));
        // it is a key of that plateau: the others keep the plateau before them
        assertEquals("a", baselineOf(workspace, "b", null));
    }

    @Test
    void aBaselineKeyMakesTheFirstPlateauComparable() {
        val workspace = workspace(
            """
                - id: a
                  path: p/a
                  baseline: c
                - id: b
                  path: p/b
                - id: c
                  path: p/c
            """
        );
        // one hop only: no cycle can be written, a compared with c is not c compared with a
        assertEquals("c", baselineOf(workspace, "a", null));
    }

    @Test
    void theBaselineAskedForWinsOverTheKeyAndTheOrder() {
        val workspace = workspace(
            """
                - id: a
                  path: p/a
                - id: b
                  path: p/b
                - id: c
                  path: p/c
                  baseline: b
            """
        );
        assertEquals("a", baselineOf(workspace, "c", "a"));
        // even for the first plateau, which has none by default
        assertEquals("c", baselineOf(workspace, "a", "c"));
    }

    @Test
    void anUnknownBaselineAskedForListsThePlateaus() {
        val workspace = workspace(PLAIN);
        val e = assertThrows(ArchiCodeException.class, () -> baselineOf(workspace, "c", "nope"));
        assertEquals("unknown baseline `nope`: the plateaus of this workspace are `a`, `b`, `c`", e.getMessage());
    }

    @Test
    void thePlateauItselfIsNoBaseline() {
        val workspace = workspace(PLAIN);
        val e = assertThrows(ArchiCodeException.class, () -> baselineOf(workspace, "c", "c"));
        assertEquals(
            "the baseline `c` is the plateau that is compared: choose another plateau to compare it with",
            e.getMessage()
        );
    }

    @Test
    void aBaselineKeyMustNameAnotherPlateauOfTheList() {
        val unknown = workspace(
            """
                - id: a
                  path: p/a
                - id: b
                  path: p/b
                  baseline: z
            """
        );
        val e = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(unknown));
        assertEquals(
            "the plateau `b` has the `baseline` `z`, which is not in `settings.plateaus` (`a`, `b`)",
            e.getMessage()
        );
    }

    @Test
    void aPlateauThatNamesItselfIsRefused() {
        val self = workspace(
            """
                - id: a
                  path: p/a
                  baseline: a
                - id: b
                  path: p/b
            """
        );
        val e = assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(self));
        assertEquals(
            "the plateau `a` names itself as its `baseline`: choose another plateau to compare it with",
            e.getMessage()
        );
    }

    @Test
    void theBaselineKeyIsReadWithTheOtherKeys() {
        val workspace = workspace(
            """
                - id: a
                  path: p/a
                - id: b
                  name: B
                  horizon: 2027
                  path: p/b
                  baseline: a
            """
        );
        val plateau = workspaceFactory.create(workspace, null, "b").getPlateau();
        assertEquals("a", plateau.getBaseline());
        assertEquals("B", plateau.getName());
    }
}

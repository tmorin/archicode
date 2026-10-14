package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.workspace.Settings;
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
 * {@code plateau add}: the folder of a plateau is copied, the new plateau is appended to {@code settings.plateaus}, and
 * the rest of workspace.yaml stays as the author wrote it.
 */
@QuarkusTest
class PlateauAdderTest {

    @Inject
    PlateauAdder plateauAdder;

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private static final String SYSTEM = """
    header:
      kind: "archicode.morin.io/system"
      version: "1"
    content:
      id: "shop"
      name: "Shop"
    """;

    @SneakyThrows
    private Path workspace(String yaml, String... folders) {
        Files.writeString(dir.resolve("workspace.yaml"), yaml);
        for (val folder : folders) {
            Files.createDirectories(dir.resolve(folder));
            Files.writeString(dir.resolve(folder).resolve("shop.yaml"), SYSTEM);
        }
        return dir.resolve("workspace.yaml");
    }

    @SneakyThrows
    private String text() {
        return Files.readString(dir.resolve("workspace.yaml"));
    }

    private static Settings.Plateau plateau(String path) {
        return Settings.Plateau.builder().id("x").path(path).build();
    }

    // ---- the folder

    @Test
    void theNewFolderGetsTheNextMultipleOfTenAboveTheSiblings() {
        val plateaus = List.of(plateau("plateaus/10_as-is"), plateau("plateaus/30_to-be"));
        assertEquals("plateaus/40_p2", PlateauAdder.defaultPath(plateaus, plateaus.get(0), "p2"));
        assertEquals(
            "plateaus/20_p1",
            PlateauAdder.defaultPath(List.of(plateau("plateaus/10_as-is")), plateau("plateaus/10_as-is"), "p1")
        );
        // not a multiple of ten: still the next one
        assertEquals(
            "plateaus/40_p",
            PlateauAdder.defaultPath(List.of(plateau("plateaus/35_a")), plateau("plateaus/35_a"), "p")
        );
    }

    @Test
    void aSourceWithoutANumberGivesAFolderWithoutOne() {
        assertEquals(
            "plateaus/p1",
            PlateauAdder.defaultPath(List.of(plateau("plateaus/as-is")), plateau("plateaus/as-is"), "p1")
        );
        assertEquals("p1", PlateauAdder.defaultPath(List.of(plateau("as-is")), plateau("as-is"), "p1"));
    }

    @Test
    void theNumbersOfOtherFoldersDoNotCount() {
        val plateaus = List.of(plateau("plateaus/10_a"), plateau("other/90_b"));
        assertEquals("plateaus/20_p", PlateauAdder.defaultPath(plateaus, plateaus.get(0), "p"));
    }

    @Test
    @SneakyThrows
    void theFolderIsCopiedAndTheEntryAppended() {
        val path = workspace(
            "settings:\n  plateaus:\n    - id: as-is\n      path: plateaus/10_as-is\n",
            "plateaus/10_as-is"
        );
        Files.createDirectories(dir.resolve("plateaus/10_as-is/sub"));
        Files.writeString(dir.resolve("plateaus/10_as-is/sub/notes.txt"), "notes");

        val added = plateauAdder.add(path, "to-be", "as-is", "To be", "2027-Q1", null);

        assertEquals("plateaus/20_to-be", added.path());
        assertEquals(SYSTEM, Files.readString(dir.resolve("plateaus/20_to-be/shop.yaml")));
        assertEquals("notes", Files.readString(dir.resolve("plateaus/20_to-be/sub/notes.txt")));
        assertTrue(Files.exists(dir.resolve("plateaus/10_as-is/shop.yaml")), "the source is left alone");
        assertEquals(
            """
            settings:
              plateaus:
                - id: as-is
                  path: plateaus/10_as-is
                - id: to-be
                  name: "To be"
                  horizon: "2027-Q1"
                  path: plateaus/20_to-be
            """,
            text()
        );
        // and the result is a workspace that loads, with the new plateau as the last one
        val workspace = workspaceFactory.create(path);
        assertEquals("to-be", workspace.getPlateau().getId());
        assertEquals("To be", workspace.getPlateau().getName());
    }

    @Test
    void thePathCanBeChosen() {
        val path = workspace("settings:\n  plateaus:\n    - id: a\n      path: p/10_a\n", "p/10_a");
        assertEquals("elsewhere/b", plateauAdder.add(path, "b", "a", null, null, "./elsewhere/b/").path());
        assertTrue(Files.isDirectory(dir.resolve("elsewhere/b")));
        assertTrue(text().endsWith("    - id: b\n      path: elsewhere/b\n"), text());
    }

    // ---- workspace.yaml stays as it was

    @Test
    void commentsAndOtherKeysStayWhereTheyWere() {
        val before = """
        # The architecture of the shop.
        styles:
          by-tags:
            external:
              background-color: lightgray   # grey
        settings:
          name: "Shop"   # shown by the editor
          # the states of the shop
          plateaus:   # as is, then to be
            # where we are
            - id: "as-is"
              path: "plateaus/10_as-is"   # today

            # the next one, once it is built
            - id: "p1"
              name: "Phase 1"
              path: "plateaus/20_p1"
          views:
            path: "views"   # the views

        # the end
        """;
        val path = workspace(before, "plateaus/10_as-is", "plateaus/20_p1");

        plateauAdder.add(path, "p2", "p1", "Phase 2", null, null);

        val inserted = "    - id: \"p2\"\n      name: \"Phase 2\"\n      path: \"plateaus/30_p2\"\n";
        val anchor = "      path: \"plateaus/20_p1\"\n";
        assertEquals(before.replace(anchor, anchor + inserted), text());
    }

    @Test
    void anEmptyFlowListBecomesABlockList() {
        val path = workspace("settings:\n  plateaus: []   # none yet\n", "x");
        // an empty list has nothing to copy from
        val e = assertThrows(ArchiCodeException.class, () -> plateauAdder.add(path, "b", "a", null, null, null));
        assertTrue(e.getMessage().startsWith("the workspace declares no `settings.plateaus`"), e.getMessage());
        // the editing itself
        val edited = PlateauAdder.appendEntry(
            "a: 1\nsettings:\n  plateaus: []   # none yet\n  name: n\nb: 2\n",
            Settings.Plateau.builder().id("a").path("p/a").build()
        );
        assertEquals(
            "a: 1\nsettings:\n  plateaus: # none yet\n    - id: a\n      path: p/a\n  name: n\nb: 2\n",
            edited
        );
    }

    @Test
    void aFlowEntryIsFollowedByAFlowEntry() {
        val edited = PlateauAdder.appendEntry(
            "settings:\n  plateaus:\n    - {id: a, path: p/10_a}\n",
            Settings.Plateau.builder().id("b").name("Be").path("p/20_b").build()
        );
        assertEquals(
            "settings:\n  plateaus:\n    - {id: a, path: p/10_a}\n    - {id: b, name: Be, path: p/20_b}\n",
            edited
        );
    }

    @Test
    void theLineEndingsOfTheFileAreKept() {
        val edited = PlateauAdder.appendEntry(
            "settings:\r\n  plateaus:\r\n    - id: a\r\n      path: p/10_a\r\nviews: {}\r\n",
            Settings.Plateau.builder().id("b").path("p/20_b").build()
        );
        assertEquals(
            "settings:\r\n  plateaus:\r\n    - id: a\r\n      path: p/10_a\r\n    - id: b\r\n      path: p/20_b\r\nviews: {}\r\n",
            edited
        );
    }

    @Test
    void listItemsAtTheIndentOfTheKeyAreFollowed() {
        val edited = PlateauAdder.appendEntry(
            "settings:\n  plateaus:\n  - id: a\n    path: p/10_a\n  views:\n    path: v\n",
            Settings.Plateau.builder().id("b").path("p/20_b").build()
        );
        assertEquals(
            "settings:\n  plateaus:\n  - id: a\n    path: p/10_a\n  - id: b\n    path: p/20_b\n  views:\n    path: v\n",
            edited
        );
    }

    @Test
    void aValueThatYamlWouldReadAsSomethingElseIsQuoted() {
        val edited = PlateauAdder.appendEntry(
            "settings:\n  plateaus:\n    - id: a\n      path: p/a\n",
            Settings.Plateau.builder().id("2027").name("As is: now").horizon("yes").path("p/2027").build()
        );
        assertTrue(
            edited.contains("- id: \"2027\"\n      name: \"As is: now\"\n      horizon: \"yes\"\n      path: p/2027\n"),
            edited
        );
    }

    // ---- refusals, and nothing is left behind

    private String refusal(Path path, String id, String from, String pathOverride) {
        return assertThrows(ArchiCodeException.class, () ->
            plateauAdder.add(path, id, from, null, null, pathOverride)
        ).getMessage();
    }

    @Test
    void whatCannotBeAddedIsRefusedAndNothingIsWritten() {
        val before = "settings:\n  plateaus:\n    - id: a\n      path: p/10_a\n    - id: b\n      path: p/20_b\n";
        val path = workspace(before, "p/10_a", "p/20_b");
        assertEquals(
            "unknown plateau `zz` to copy from: the plateaus of this workspace are `a`, `b`",
            refusal(path, "c", "zz", null)
        );
        assertEquals("the plateau `a` exists already", refusal(path, "a", "b", null));
        assertTrue(refusal(path, "c d", "a", null).startsWith("the plateau id `c d` is not valid"));
        assertTrue(refusal(path, "c", "a", "../c").contains("contains `..`"));
        assertTrue(refusal(path, "c", "a", "/c").contains("is absolute"));
        assertEquals("the path `p/20_b` is the folder of the plateau `b` already", refusal(path, "c", "a", "p/20_b"));
        assertTrue(refusal(path, "c", "a", "p/10_a/inner").contains("may not be one inside the other"));
        assertTrue(refusal(path, "c", "a", ".").contains("is the folder of workspace.yaml itself"));
        assertEquals(before, text());
        assertFalse(Files.exists(dir.resolve("p/30_c")));
    }

    @Test
    void anExistingFolderIsNeverOverwritten() {
        val path = workspace("settings:\n  plateaus:\n    - id: a\n      path: p/10_a\n", "p/10_a", "p/20_c");
        assertEquals("`p/20_c` exists already: choose another folder with --path", refusal(path, "c", "a", null));
    }

    @Test
    void aWorkspaceWithoutPlateausExplainsHowToStart() {
        val path = workspace("settings:\n  manifests:\n    paths: [manifests]\n");
        val message = refusal(path, "c", "a", null);
        assertTrue(
            message.startsWith("the workspace declares no `settings.plateaus`: `plateau add` copies a plateau"),
            message
        );
    }

    @Test
    void theFlowStyleOfTheListIsNotEditedAndSaysSo() {
        val path = workspace("settings:\n  plateaus: [{id: a, path: p/10_a}]\n", "p/10_a");
        val message = refusal(path, "b", "a", null);
        assertTrue(message.contains("written in the flow style"), message);
        assertFalse(Files.exists(dir.resolve("p/20_b")), "nothing was copied");
    }

    @Test
    void theSourcePlateauMayNotBeTheFolderOfTheWorkspace() {
        val path = workspace("settings:\n  plateaus:\n    - id: a\n      path: .\n");
        assertTrue(
            refusal(path, "b", "a", null).contains("is the folder of workspace.yaml itself and cannot be copied")
        );
    }

    @Test
    @SneakyThrows
    void onlyYamlIsEdited() {
        val json = dir.resolve("workspace.json");
        Files.writeString(json, "{\"settings\":{\"plateaus\":[{\"id\":\"a\",\"path\":\"p\"}]}}");
        assertTrue(
            assertThrows(ArchiCodeException.class, () -> plateauAdder.add(json, "b", "a", null, null, null))
                .getMessage()
                .contains("edits a YAML workspace file")
        );
    }
}

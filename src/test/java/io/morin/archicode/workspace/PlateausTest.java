package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
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
 * {@code settings.plateaus}: an ordered list of folders of manifests, one of which the loader reads. The editor applies
 * the same rules in the same words: {@code plateaus.test.js} runs the same cases.
 */
@QuarkusTest
class PlateausTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    MapperFactory mapperFactory;

    @TempDir
    Path dir;

    private static String system(String id, String name) {
        return """
        header:
          kind: "archicode.morin.io/system"
          version: "1"
        content:
          id: "%s"
          name: "%s"
        """.formatted(id, name);
    }

    @SneakyThrows
    private Path workspace(String yaml, String... pathsAndTexts) {
        Files.writeString(dir.resolve("workspace.yaml"), yaml);
        for (int i = 0; i < pathsAndTexts.length; i += 2) {
            val file = dir.resolve(pathsAndTexts[i]);
            Files.createDirectories(file.getParent());
            Files.writeString(file, pathsAndTexts[i + 1]);
        }
        return dir.resolve("workspace.yaml");
    }

    /** Two plateaus that differ by the name of the system `shop` and by a system that only the second has. */
    private Path twoPlateaus(String settings) {
        return workspace(
            "settings:\n" + settings,
            "plateaus/10_as-is/shop.yaml",
            system("shop", "Shop as is"),
            "plateaus/20_to-be/shop.yaml",
            system("shop", "Shop to be"),
            "plateaus/20_to-be/crm.yaml",
            system("crm", "CRM")
        );
    }

    private static final String TWO = """
      plateaus:
        - id: as-is
          name: As is
          path: plateaus/10_as-is
        - id: to-be
          name: To be
          horizon: 2027-Q1
          path: plateaus/20_to-be
    """;

    private String messageOf(Path workspace) {
        return messageOf(workspace, null);
    }

    private String messageOf(Path workspace, String plateau) {
        return assertThrows(ArchiCodeException.class, () ->
            workspaceFactory.create(workspace, null, plateau)
        ).getMessage();
    }

    private static List<String> names(io.morin.archicode.workspace.Workspace workspace) {
        return workspace.appIndex
            .listAllElementReferences(e -> true)
            .stream()
            .map(r -> r + "=" + workspace.appIndex.getElementByReference(r).getName())
            .sorted()
            .toList();
    }

    // ---- reading

    @Test
    void thePlateausAreAnOrderedListWithAnOptionalHorizon() {
        val settings = workspaceFactory.create(twoPlateaus(TWO)).getSettings();
        assertEquals(
            List.of("as-is", "to-be"),
            settings
                .getPlateaus()
                .stream()
                .map(p -> p.getId())
                .toList()
        );
        assertNull(settings.getPlateaus().get(0).getHorizon());
        assertEquals("2027-Q1", settings.getPlateaus().get(1).getHorizon());
        assertEquals("plateaus/20_to-be", settings.getPlateaus().get(1).getPath());
    }

    @Test
    void theLastPlateauIsReadWhenNoneIsAskedFor() {
        val workspace = workspaceFactory.create(twoPlateaus(TWO));
        assertEquals("to-be", workspace.getPlateau().getId());
        assertEquals(List.of("crm=CRM", "shop=Shop to be"), names(workspace));
    }

    @Test
    void currentNamesThePlateauReadWhenNoneIsAskedFor() {
        val workspace = workspaceFactory.create(twoPlateaus("  current: as-is\n" + TWO));
        assertEquals("as-is", workspace.getPlateau().getId());
        assertEquals(List.of("shop=Shop as is"), names(workspace));
    }

    @Test
    void thePlateauAskedForWinsOverCurrent() {
        val path = twoPlateaus("  current: as-is\n" + TWO);
        assertEquals(List.of("crm=CRM", "shop=Shop to be"), names(workspaceFactory.create(path, null, "to-be")));
        assertEquals(List.of("shop=Shop as is"), names(workspaceFactory.create(path, null, "as-is")));
    }

    @Test
    void theSameReferenceInTwoPlateausIsNoDuplicate() {
        // `shop` is in both: each plateau is one set of manifests
        val path = twoPlateaus(TWO);
        assertDoesNotThrow(() -> workspaceFactory.create(path, null, "as-is"));
        assertDoesNotThrow(() -> workspaceFactory.create(path, null, "to-be"));
    }

    @Test
    void aReferenceDeclaredTwiceInOnePlateauIsAnErrorThatNamesBothFiles() {
        val path = workspace(
            "settings:\n" + TWO,
            "plateaus/10_as-is/shop.yaml",
            system("shop", "Shop"),
            "plateaus/20_to-be/a.yaml",
            system("shop", "A"),
            "plateaus/20_to-be/b.yaml",
            system("shop", "B")
        );
        assertDoesNotThrow(() -> workspaceFactory.create(path, null, "as-is"));
        assertEquals(
            "the reference `shop` is declared twice: in `plateaus/20_to-be/a.yaml` and `plateaus/20_to-be/b.yaml`",
            messageOf(path, "to-be")
        );
    }

    @Test
    void aSinglePlateauIsRead() {
        val path = workspace(
            "settings:\n  plateaus:\n    - id: only\n      path: stuff\n",
            "stuff/shop.yaml",
            system("shop", "Shop")
        );
        val workspace = workspaceFactory.create(path);
        assertEquals("only", workspace.getPlateau().getId());
        assertEquals(List.of("shop=Shop"), names(workspace));
    }

    @Test
    void aSinglePlateauMayBeTheFolderOfTheWorkspaceItself() {
        // `.` holds the workspace file too, which is no manifest
        val path = workspace(
            "settings:\n  plateaus:\n    - id: only\n      path: .\n",
            "shop.yaml",
            system("shop", "Shop")
        );
        assertEquals(List.of("shop=Shop"), names(workspaceFactory.create(path)));
    }

    @Test
    void aWorkspaceWithoutPlateausIsReadAsItAlwaysWas() {
        val path = workspace("settings:\n  views:\n    path: out\n", "manifests/shop.yaml", system("shop", "Shop"));
        val workspace = workspaceFactory.create(path);
        assertNull(workspace.getPlateau());
        assertEquals(List.of("shop=Shop"), names(workspace));
        assertTrue(workspace.getSettings().getPlateaus().isEmpty());
        // and writes nothing of plateaus when it is written again
        val tree = mapperFactory.create(MapperFormat.YAML).valueToTree(workspace.getSettings());
        assertTrue(!tree.has("plateaus") && !tree.has("current"));
    }

    // ---- refusals

    @Test
    void fromIsReservedAndRefusedWithAMessage() {
        val message = messageOf(
            twoPlateaus(
                """
                  plateaus:
                    - id: as-is
                      path: plateaus/10_as-is
                    - id: to-be
                      from: as-is
                      path: plateaus/20_to-be
                """
            )
        );
        assertTrue(message.startsWith("the plateau `to-be` has a `from`: it is reserved for a later version"), message);
        assertTrue(message.contains("Remove it and give the plateau its own `path`"), message);
    }

    @Test
    void anUnknownKeyOfAPlateauIsRefusedAndTheKnownOnesAreListed() {
        val message = messageOf(
            twoPlateaus(
                """
                  plateaus:
                    - id: as-is
                      path: plateaus/10_as-is
                      date: 2026
                """
            )
        );
        assertEquals(
            "the plateau `as-is` has the key `date`, which ArchiCode does not know: a plateau has `id`, `name`, `horizon` and `path`",
            message
        );
    }

    @Test
    void aPlateauWithoutAPathIsRefused() {
        val message = messageOf(
            twoPlateaus("  plateaus:\n    - id: as-is\n    - id: to-be\n      path: plateaus/20_to-be\n")
        );
        assertEquals(
            "the plateau `as-is` has no `path`: write the folder of its manifests, relative to the folder of workspace.yaml (for example `plateaus/as-is`)",
            message
        );
    }

    @Test
    void aPlateauWithoutAnIdIsRefused() {
        val message = messageOf(twoPlateaus("  plateaus:\n    - path: plateaus/10_as-is\n"));
        assertEquals("the plateau number 1 has no `id`", message);
    }

    @Test
    void aPathThatLeavesTheFolderOrIsAbsoluteIsRefused() {
        for (val bad : List.of("../shared", "a/../../b", "a\\..\\b", "/etc", "\\share", "C:\\data", "d:/data")) {
            val message = messageOf(
                twoPlateaus("  plateaus:\n    - id: p\n      path: \"" + bad.replace("\\", "\\\\") + "\"\n")
            );
            assertTrue(message.startsWith("the path `" + bad + "` of the plateau `p` "), bad + " -> " + message);
            assertTrue(message.contains("it must be a folder below the one of workspace.yaml"), message);
        }
        assertTrue(messageOf(twoPlateaus("  plateaus:\n    - id: p\n      path: ../x\n")).contains("contains `..`:"));
        assertTrue(messageOf(twoPlateaus("  plateaus:\n    - id: p\n      path: /x\n")).contains("is absolute:"));
    }

    @Test
    void aDuplicateIdIsRefused() {
        val message = messageOf(
            twoPlateaus(
                "  plateaus:\n    - id: p\n      path: plateaus/10_as-is\n    - id: p\n      path: plateaus/20_to-be\n"
            )
        );
        assertEquals("the plateau id `p` is used more than once", message);
    }

    @Test
    void aDuplicatePathIsRefusedWhicheverWayItIsWritten() {
        val message = messageOf(
            twoPlateaus(
                "  plateaus:\n    - id: a\n      path: plateaus/10_as-is\n    - id: b\n      path: ./plateaus/10_as-is/\n"
            )
        );
        assertEquals(
            "the plateaus `a` and `b` share the path `plateaus/10_as-is`: each plateau needs a folder of its own",
            message
        );
    }

    @Test
    void dotAsAPathIsRefusedWithSeveralPlateaus() {
        val message = messageOf(
            twoPlateaus("  plateaus:\n    - id: a\n      path: .\n    - id: b\n      path: plateaus/20_to-be\n")
        );
        assertEquals(
            "the plateau `a` has the path `.`, which is the folder of workspace.yaml itself and holds the others: with several plateaus, give each one a folder of its own",
            message
        );
    }

    @Test
    void anIdThatCannotBeAFolderNameIsRefused() {
        val message = messageOf(twoPlateaus("  plateaus:\n    - id: \"a/b\"\n      path: plateaus/10_as-is\n"));
        assertTrue(message.startsWith("the plateau id `a/b` is not valid: use letters, digits"), message);
    }

    @Test
    void aPlateauThatIsNotAMappingIsRefused() {
        assertEquals(
            "the plateau number 1 of `settings.plateaus` must be a mapping with an `id` and a `path`",
            messageOf(twoPlateaus("  plateaus:\n    - as-is\n"))
        );
    }

    @Test
    void currentMustNameAPlateau() {
        assertEquals(
            "`settings.current` names the plateau `x`, which is not in `settings.plateaus` (`as-is`, `to-be`)",
            messageOf(twoPlateaus("  current: x\n" + TWO))
        );
        assertEquals(
            "`settings.current` is `x` but the workspace declares no `settings.plateaus`",
            messageOf(workspace("settings:\n  current: x\n"))
        );
    }

    @Test
    void aPlateauThatIsAskedForMustBeThere() {
        assertEquals(
            "unknown plateau `nope`: the plateaus of this workspace are `as-is`, `to-be`",
            messageOf(twoPlateaus(TWO), "nope")
        );
        assertEquals(
            "`--plateau nope` cannot be used: the workspace declares no `settings.plateaus`",
            messageOf(workspace("settings:\n  views:\n    path: out\n"), "nope")
        );
    }

    @Test
    void theFolderOfThePlateauReadMustExist() {
        val path = workspace("settings:\n  plateaus:\n    - id: a\n      path: nowhere\n");
        assertEquals("the folder `nowhere` of the plateau `a` does not exist", messageOf(path));
    }

    @Test
    void manifestsPathsAndPlateausTogetherAreAnError() {
        val message = messageOf(twoPlateaus("  manifests:\n    paths:\n      - manifests\n" + TWO));
        assertTrue(
            message.startsWith("`settings.manifests.paths` and `settings.plateaus` are both written: choose one."),
            message
        );
    }

    @Test
    void manifestsPathsLeavingTheFolderOrAbsoluteIsRefusedAndTheMessageSaysWhatToChange() {
        for (val bad : List.of("../shared", "/srv/manifests", "a/../../b")) {
            val message = messageOf(
                workspace("settings:\n  manifests:\n    paths:\n      - manifests\n      - " + bad + "\n")
            );
            assertTrue(message.startsWith("the path `" + bad + "` of `settings.manifests.paths` "), message);
            assertTrue(message.contains("Move the folder below workspace.yaml"), message);
            assertTrue(message.contains("change the path to match"), message);
        }
    }

    @Test
    void severalProblemsAreInOneMessageOnePerLine() {
        val message = messageOf(twoPlateaus("  plateaus:\n    - id: a\n    - id: a\n      path: /x\n"));
        assertEquals(3, message.split("\n").length, message);
    }
}

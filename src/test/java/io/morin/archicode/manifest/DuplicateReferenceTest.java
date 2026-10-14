package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.WorkspaceFactory;
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
 * A reference declared twice makes the loader fail, naming the reference and the files, instead of keeping one of the
 * declarations (which one depended on the hash of their content). The editor applies the same rule and says the same
 * thing: {@code duplicate-reference.test.js} runs the same cases.
 */
@QuarkusTest
class DuplicateReferenceTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    private static String system(String id, String name, String... elements) {
        return (
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "%s"
              name: "%s"
            """.formatted(id, name) + (elements.length == 0 ? "" : "  elements:\n" + String.join("", elements))
        );
    }

    private static String container(String id, String name) {
        return "    - kind: \"container\"\n      id: \"%s\"\n      name: \"%s\"\n".formatted(id, name);
    }

    private static String nodeUnder(String parent, String id, String name) {
        return """
        header:
          kind: "archicode.morin.io/container"
          version: "1"
          parent: "%s"
        content:
          id: "%s"
          name: "%s"
        """.formatted(parent, id, name);
    }

    private static String node(String id, String name) {
        return """
        header:
          kind: "archicode.morin.io/node"
          version: "1"
        content:
          id: "%s"
          name: "%s"
        """.formatted(id, name);
    }

    @SneakyThrows
    private Path workspace(String... pathsAndTexts) {
        Files.writeString(
            dir.resolve("workspace.yaml"),
            """
            settings:
              manifests:
                paths:
                  - manifests
                  - shared
            """
        );
        for (int i = 0; i < pathsAndTexts.length; i += 2) {
            val file = dir.resolve(pathsAndTexts[i]);
            Files.createDirectories(file.getParent());
            Files.writeString(file, pathsAndTexts[i + 1]);
        }
        return dir.resolve("workspace.yaml");
    }

    private String messageOf(Path workspace) {
        return assertThrows(ArchiCodeException.class, () -> workspaceFactory.create(workspace)).getMessage();
    }

    @Test
    void twoDifferentCopiesFailWithBothFiles() {
        val message = messageOf(
            workspace("manifests/a.yaml", system("shop", "Shop"), "manifests/b.yaml", system("shop", "The shop"))
        );
        assertEquals("the reference `shop` is declared twice: in `manifests/a.yaml` and `manifests/b.yaml`", message);
    }

    @Test
    void twoIdenticalCopiesFailAsWell() {
        val message = messageOf(
            workspace("manifests/a.yaml", system("shop", "Shop"), "manifests/b.yaml", system("shop", "Shop"))
        );
        assertEquals("the reference `shop` is declared twice: in `manifests/a.yaml` and `manifests/b.yaml`", message);
    }

    @Test
    void theFilesAreNamedFromTheFolderOfTheWorkspaceWhicheverFolderTheyAreIn() {
        val message = messageOf(
            workspace("shared/z.yaml", system("shop", "Shop"), "manifests/a.yaml", system("shop", "Shop"))
        );
        assertEquals("the reference `shop` is declared twice: in `manifests/a.yaml` and `shared/z.yaml`", message);
    }

    @Test
    void anElementNestedInAFileAndAManifestPlacedUnderItsParentAreTheSameReference() {
        val message = messageOf(
            workspace(
                "manifests/shop.yaml",
                system("shop", "Shop", container("web", "Web")),
                "manifests/web.yaml",
                nodeUnder("shop", "web", "Web again")
            )
        );
        assertEquals(
            "the reference `shop.web` is declared twice: in `manifests/shop.yaml` and `manifests/web.yaml`",
            message
        );
    }

    @Test
    void anElementNestedTwiceInOneFileIsToldWithThatFile() {
        val message = messageOf(
            workspace("manifests/shop.yaml", system("shop", "Shop", container("web", "Web"), container("web", "Web")))
        );
        assertEquals("the reference `shop.web` is declared twice in `manifests/shop.yaml`", message);
    }

    @Test
    void severalDeclarationsAndSeveralReferencesAreAllToldInAStableOrder() {
        val message = messageOf(
            workspace(
                "manifests/c.yaml",
                system("shop", "C", container("web", "C")),
                "manifests/a.yaml",
                system("shop", "A", container("web", "A")),
                "manifests/b.yaml",
                system("shop", "B"),
                "manifests/d.yaml",
                system("mail", "D"),
                "shared/d.yaml",
                system("mail", "D")
            )
        );
        assertEquals(
            String.join(
                "\n",
                "the reference `mail` is declared twice: in `manifests/d.yaml` and `shared/d.yaml`",
                "the reference `shop` is declared 3 times: in `manifests/a.yaml`, `manifests/b.yaml` and `manifests/c.yaml`",
                "the reference `shop.web` is declared twice: in `manifests/a.yaml` and `manifests/c.yaml`"
            ),
            message
        );
    }

    @Test
    void theSameReferenceInTheApplicationAndTheTechnologyLayersIsNotADuplicate() {
        assertDoesNotThrow(() ->
            workspaceFactory.create(
                workspace("manifests/a.yaml", system("shop", "Shop"), "manifests/n.yaml", node("shop", "Shop node"))
            )
        );
    }

    @Test
    void aWorkspaceWithoutDuplicatesLoads() {
        val workspace = workspaceFactory.create(
            workspace(
                "manifests/a.yaml",
                system("shop", "Shop", container("web", "Web")),
                "manifests/m.yaml",
                system("mail", "Mail"),
                "shared/w.yaml",
                nodeUnder("shop", "api", "Api")
            )
        );
        assertEquals(
            List.of("mail", "shop", "shop.api", "shop.web"),
            workspace.appIndex
                .listAllElementReferences(e -> true)
                .stream()
                .sorted()
                .toList()
        );
    }

    private static String viewManifest(String id) {
        return """
        header:
          kind: "archicode.morin.io/view"
          version: "1"
        content:
          id: "%s"
          viewpoint: "overview"
          layer: "application"
          properties:
            element: "shop"
        """.formatted(id);
    }

    private static String storyManifest(String id) {
        return """
        header:
          kind: "archicode.morin.io/story"
          version: "1"
        content:
          id: "%s"
          name: "A story"
          steps: []
        """.formatted(id);
    }

    @Test
    void twoViewsOrTwoStoriesWithTheSameIdFailAsWellButAViewAndAStoryMayShareOne() {
        val message = messageOf(
            workspace(
                "manifests/view.v1.yaml",
                viewManifest("v1"),
                "manifests/view.v1b.yaml",
                viewManifest("v1"),
                "manifests/story.s1.yaml",
                storyManifest("s1"),
                "shared/story.s1.yaml",
                storyManifest("s1"),
                "manifests/view.same.yaml",
                viewManifest("same"),
                "manifests/story.same.yaml",
                storyManifest("same")
            )
        );
        assertEquals(
            String.join(
                "\n",
                "the story `s1` is declared twice: in `manifests/story.s1.yaml` and `shared/story.s1.yaml`",
                "the view `v1` is declared twice: in `manifests/view.v1.yaml` and `manifests/view.v1b.yaml`"
            ),
            message
        );
    }

    @Test
    void theMessageWordsAreThoseOfTheEditor() {
        assertEquals(
            "the reference `x` is declared 3 times in `a.yaml`",
            ManifestParser.duplicateMessage("reference", "x", List.of("a.yaml", "a.yaml", "a.yaml"))
        );
        assertEquals(
            "the reference `x` is declared 3 times: in `a.yaml` (twice) and `b.yaml`",
            ManifestParser.duplicateMessage("reference", "x", List.of("b.yaml", "a.yaml", "a.yaml"))
        );
    }
}

package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The workspace of a comparison: the plateau that is compared, and what only the baseline had, merged under its parents,
 * so that the views can draw it. The union is built on a copy of the plateau already loaded, and nothing is added to the workspaces it comes from.
 */
@QuarkusTest
class UnionWorkspaceTest {

    private static final Path WORKSPACE = Path.of(
        "src/test/resources/plateau-comparison/workspace.yaml"
    ).toAbsolutePath();

    @Inject
    WorkspaceFactory workspaceFactory;

    @Test
    void theUnionHoldsTheTargetAndWhatOnlyTheBaselineHad() {
        val base = workspaceFactory.create(WORKSPACE, null, "as-is");
        val target = workspaceFactory.create(WORKSPACE, null, "to-be");
        val comparison = new PlateauComparer(new ObjectMapper()).compare(base, target);
        val union = workspaceFactory.createUnion(target, base, comparison);

        assertTrue(union.appIndex.searchElement("shop.legacy").isPresent(), "what was removed is there");
        assertTrue(union.appIndex.searchElement("shop.mobile").isPresent(), "and so is what is new");
        assertEquals(
            target.appIndex.listAllElementReferences(e -> true).size() + 1,
            union.appIndex.listAllElementReferences(e -> true).size()
        );
        // under its parent, which was reindexed
        val shop = (Parent<?>) union.appIndex.getElementByReference("shop");
        assertTrue(
            shop
                .getElements()
                .stream()
                .anyMatch(e -> e.getId().equals("legacy"))
        );
        assertEquals("shop", union.appIndex.getReferenceByElement(union.appIndex.getElementByReference("shop")));
        // the plateau and its baseline are known, for the legend
        assertEquals("to-be", union.getPlateau().getId());
        assertEquals("as-is", union.getBaseline().getId());

        // the workspaces it was made from are as they were
        assertFalse(target.appIndex.searchElement("shop.legacy").isPresent());
        assertFalse(
            ((Parent<?>) target.appIndex.getElementByReference("shop"))
                .getElements()
                .stream()
                .anyMatch(e -> e.getId().equals("legacy"))
        );
        assertTrue(base.appIndex.searchElement("shop.legacy").isPresent());
        // the union is made from the plateau already loaded, and is a new tree each time: neither the target nor an earlier union
        // sees what a later one adds, and nothing was parsed again
        val again = workspaceFactory.createUnion(target, base, comparison);
        assertFalse(again == union);
        assertFalse(again.getApplication() == union.getApplication());
        assertFalse(again.getApplication() == target.getApplication());
        assertEquals(
            union.appIndex.listAllElementReferences(e -> true),
            again.appIndex.listAllElementReferences(e -> true)
        );
        assertFalse(target.appIndex.searchElement("shop.legacy").isPresent());
        assertEquals(
            1,
            ((Parent<?>) again.appIndex.getElementByReference("shop"))
                .getElements()
                .stream()
                .filter(e -> e.getId().equals("legacy"))
                .count()
        );
    }

    @Test
    void theViewsOfAWorkspaceAreWrittenToTheFolderOfItsPlateau() {
        assertEquals(
            "views-to-be",
            workspaceFactory.create(WORKSPACE, null, "to-be").getSettings().getViews().getPath()
        );
        assertEquals(
            "views-later",
            workspaceFactory.create(WORKSPACE, null, "later").getSettings().getViews().getPath()
        );
        assertEquals(
            "out-as-is",
            workspaceFactory.create(WORKSPACE, Path.of("out"), "as-is").getSettings().getViews().getPath()
        );
        val moved = workspaceFactory.withViewsPath(
            workspaceFactory.create(WORKSPACE, null, "to-be"),
            "views-to-be-vs-as-is"
        );
        assertEquals("views-to-be-vs-as-is", moved.getSettings().getViews().getPath());
        assertEquals("to-be", moved.getPlateau().getId());
    }
}

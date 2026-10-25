package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.List;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * A relationship towards the inside of a deployed application is a dependency of the node that hosts it, and the links drawn
 * for a flow read what is inside the deployed element on both ends (issue #139, decision T5, wave 019 run 0140). On the layered
 * Brightcart the container {@code shop.app} is deployed on {@code prod.dc.app-vm} and {@code shop.db} on {@code prod.dc.db-vm}:
 * the component {@code shop.app.catalog} reads {@code shop.db} (the source is inside the deployed element), and the container
 * {@code backoffice.console}, on {@code prod.dc.admin-vm}, maintains {@code shop.app.catalog} (the destination is inside it).
 * Both nodes are in the environment {@code prod}, so the links are the "secondary" ones a view about a flow draws: a facet makes
 * one. The editor draws the same links from the same kernel ({@code destination-dependencies.test.js}).
 */
@QuarkusTest
class DestinationDependenciesTest {

    private static final Path WORKSPACE = Path.of("src/test/resources/brightcart/layered/.archicode.yaml");

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpoints;

    private Viewpoint draw(boolean flow, String viewpoint, String element) {
        var workspace = workspaceFactory.create(WORKSPACE, null, "baseline");
        if (flow) {
            val facet = workspace
                .getSettings()
                .getFacets()
                .getCustoms()
                .stream()
                .filter(f -> "no-externals".equals(f.getName()))
                .findFirst()
                .orElseThrow();
            workspace = workspaceFactory.create(workspace, facet);
        }
        View view = View.builder()
            .viewpoint(viewpoint)
            .id("destinations_" + viewpoint)
            .layer(View.Layer.TECHNOLOGY)
            .properties(new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode().put("element", element))
            .build();
        return viewpoints.get(viewpoint).createViewpointFactory().create(workspace, view);
    }

    private static List<String> links(Viewpoint drawn) {
        return drawn
            .getLinks()
            .stream()
            .map(link -> link.getFrom().getItemId() + " -> " + link.getTo().getItemId() + " : " + link.getLabel())
            .sorted()
            .toList();
    }

    @Test
    void shouldLinkTheNodeOfTheContainerToTheNodeOfTheDatabaseThroughItsComponentsInAFlow() {
        val links = links(draw(true, "deep", "prod.dc"));
        assertTrue(links.contains("app-vm_shop_app -> db-vm_shop_db : reads and writes"), links.toString());
        assertTrue(links.contains("app-vm_shop_app -> db-vm_shop_db : queries"), links.toString());
    }

    @Test
    void shouldLinkTheNodeThatHostsTheCallerToTheNodeThatHostsTheContainerWhoseComponentItCalls() {
        val links = links(draw(true, "deep", "prod.dc"));
        assertTrue(
            links.contains("admin-vm_backoffice_console -> app-vm_shop_app : maintains products in"),
            links.toString()
        );
        assertTrue(
            links.contains("admin-vm_backoffice_console -> app-vm_shop_app : looks up customers in"),
            links.toString()
        );
    }

    @Test
    void shouldLeaveARelationshipBetweenTwoComponentsOfTheSameContainerInternal() {
        // shop.app.checkout reserves stock in shop.app.inventory: both are inside shop.app
        val links = links(draw(true, "deep", "prod.dc"));
        assertFalse(links.stream().anyMatch(l -> l.startsWith("app-vm_shop_app -> app-vm_shop_app")), links.toString());
    }

    @Test
    void shouldLiftTheFlowToTheNodesInTheOverviewAndTheDetailedViewpoints() {
        val overview = links(draw(true, "overview", "prod.dc.admin-vm"));
        assertTrue(
            overview.stream().anyMatch(l -> l.startsWith("prod.dc.admin-vm -> prod.dc.app-vm")),
            overview.toString()
        );
        val detailed = links(draw(true, "detailed", "prod.dc"));
        assertTrue(
            detailed.stream().anyMatch(l -> l.startsWith("prod.dc.app-vm -> prod.dc.db-vm")),
            detailed.toString()
        );
    }

    @Test
    void shouldDrawNoNewLinkWhenTheViewIsNotAboutAFlow() {
        // the links inside an environment are secondary: not drawn, by anything but a facet
        val links = links(draw(false, "deep", "prod.dc"));
        assertFalse(links.stream().anyMatch(l -> l.contains("maintains products in")), links.toString());
    }
}

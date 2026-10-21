package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Item;
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
 * The relationships of what is inside a deployed application are dependencies of the node that hosts it (wave 018, run 0133, issue #124,
 * decision D7). On the layered Brightcart {@code prod.dc.app-vm} hosts the container {@code shop.app}, which declares nothing itself:
 * its components call {@code psp}, {@code tax} and {@code mailer}, deployed on the nodes of {@code partners}, which {@code prod} uses.
 * The editor draws the same links from the same kernel ({@code technology-map-shared.test.js}, {@code descendant-dependencies.test.js}).
 */
@QuarkusTest
class DescendantDependenciesTest {

    private static final Path WORKSPACE = Path.of("src/test/resources/brightcart/layered/workspace.yaml");

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpoints;

    private Viewpoint draw(String viewpoint, String element) {
        val workspace = workspaceFactory.create(WORKSPACE, null, "baseline");
        View view = View.builder()
            .viewpoint(viewpoint)
            .id("descendants_" + viewpoint)
            .layer(View.Layer.TECHNOLOGY)
            .properties(new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode().put("element", element))
            .build();
        return viewpoints.get(viewpoint).createViewpointFactory().create(workspace, view);
    }

    private static List<String> links(Viewpoint drawn) {
        return drawn
            .getLinks()
            .stream()
            .map(link -> link.getFrom().getItemId() + " -> " + link.getTo().getItemId())
            .sorted()
            .toList();
    }

    @Test
    void shouldLinkTheNodeThatHostsTheContainerToTheNodesThatHostWhatItsComponentsCall() {
        val links = links(draw("deep", "prod.dc.app-vm"));
        assertTrue(links.contains("app-vm_shop_app -> psp-live_psp"), links.toString());
        assertTrue(links.contains("app-vm_shop_app -> tax-live_tax"), links.toString());
        assertTrue(links.contains("app-vm_shop_app -> mail-live_mailer"), links.toString());
        assertEquals(
            3,
            links.size(),
            "what stays inside the environment (the database, the cache) is no dependency: " + links
        );
    }

    @Test
    void shouldLinkTheNodeInTheOverviewAndTheDetailedViewpointsToo() {
        val overview = links(draw("overview", "prod.dc.app-vm"));
        assertTrue(overview.contains("prod.dc.app-vm -> partners"), overview.toString());
        val detailed = links(draw("detailed", "prod.dc"));
        assertTrue(detailed.stream().anyMatch(l -> l.startsWith("prod.dc.app-vm -> partners")), detailed.toString());
        val itemsOfTheOverview = draw("overview", "prod").getItems().stream().flatMap(Item::stream).toList();
        assertTrue(itemsOfTheOverview.stream().anyMatch(i -> i.getReference().equals("partners")));
    }
}

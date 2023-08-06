package io.morin.archicode.viewpoint.detailed;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
@Slf4j
class DetailedViewpointServiceRepositoryTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @Test
    void shouldCreate() {
        val viewReference = "solution_a.system_a";

        val rawWorkspace = Workspace
            .builder()
            .application(ResourceFixtures.createWithIngressAndEgress().build())
            .build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val view = ResourceFixtures.createDetailedView("shouldCreate", viewReference);

        val context = viewpointServiceRepository.get("detailed").createViewpointFactory().create(workspace, view);
        assertEquals(3, context.getItems().size());
        assertEquals(2, context.getLinks().size());
    }
}

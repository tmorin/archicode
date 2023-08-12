package io.morin.archicode.viewpoint.deep;

import io.morin.archicode.ResourceFixtures;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.ViewpointServiceRepository;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
@Slf4j
class DeepViewpointFactoryTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    ViewpointServiceRepository viewpointServiceRepository;

    @Test
    void shouldCreateTechnologyWithApp() {
        val con_aa = Container.builder().id("con_aa").build();
        val sys_a = System.builder().id("sys_a").elements(Set.of(con_aa)).build();
        val app = Application.builder().elements(Set.of(sys_a)).build();

        val node_aa = Node.builder().id("node_aa").applications(Set.of("sys_a.con_aa")).build();
        val node_a = Node.builder().id("node_a").elements(Set.of(node_aa)).build();
        val ref = Environment.builder().id("ref").elements(Set.of(node_a)).build();
        val dep = Technology.builder().elements(Set.of(ref)).build();

        val rawWorkspace = Workspace.builder().application(app).technology(dep).build();

        val viewReference = "ref.node_a.node_aa";

        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val view = ResourceFixtures
            .createDeepViewBuilder("shouldCreateTechnologyWithApp", viewReference)
            .layer(View.Layer.TECHNOLOGY)
            .build();

        val context = viewpointServiceRepository.get("deep").createViewpointFactory().create(workspace, view);
        Assertions.assertEquals(1, context.getItems().size());
        Assertions.assertEquals(0, context.getLinks().size());
        val node = context
            .getItems()
            .stream()
            .flatMap(Item::stream)
            .filter(i -> i.getReference().equals(viewReference))
            .findFirst()
            .orElseThrow();
        Assertions.assertEquals(1, node.getChildren().size());
    }
}

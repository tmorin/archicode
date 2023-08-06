package io.morin.archicode.viewpoint.overview;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.Fixtures;
import io.morin.archicode.resource.element.application.*;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.MetaLinkFinderForEgress;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
@Slf4j
class MetaLinkFinderForEgressTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();

    @Test
    void shouldFindSameItemLevel() {
        val viewReference = "solution_a.system_a.container_a";

        val rawWorkspace = Workspace.builder().application(Fixtures.createWithEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Collections.emptyMap());

        val metaLinks = metaLinkFinderForEgress.find(workspace.appIndex, viewReference);

        log.info("solution_a.system_a.container_a {}", metaLinks);
        assertEquals(1, metaLinks.size());
        assertEquals(viewReference, metaLinks.stream().findFirst().orElseThrow().getFromReference());
        assertEquals("solution_b.system_b.container_b", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldFindLowerItemLevel() {
        val modelBuilder = Application.builder();

        // solution_a.system_a -> solution_b.system_b.container_b
        val relationship = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val system_a = System.builder().id("system_a").relationship(relationship).build();
        val solution_a = Solution.builder().id("solution_a").elements(Set.of(system_a)).build();
        val container_b = Container.builder().id("container_b").build();
        val system_b = System.builder().id("system_b").elements(Set.of(container_b)).build();
        val solution_b = Solution.builder().id("solution_b").elements(Set.of(system_b)).build();
        modelBuilder.elements(Set.of(solution_a, solution_b));

        val model = modelBuilder.build();
        val rawWorkspace = Workspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace, Collections.emptyMap());

        val metaLinks = metaLinkFinderForEgress.find(workspace.appIndex, "solution_a.system_a");
        log.info("solution_a.system_a {}", metaLinks);
        assertEquals(1, metaLinks.size());
        assertEquals("solution_a.system_a", metaLinks.stream().findFirst().orElseThrow().getFromReference());
        assertEquals("solution_b.system_b.container_b", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldFindUpperItemLevel() {
        val modelBuilder = Application.builder();

        val system_b = System.builder().id("system_b").build();
        val solution_b = Solution.builder().id("solution_b").elements(Set.of(system_b)).build();

        // solution_a.system_a.container_a -> solution_b.system_b
        val relationship = Relationship.builder().destination("solution_b.system_b").build();
        val container_a = Container.builder().id("container_a").relationship(relationship).build();
        val system_a = System.builder().id("system_a").elements(Set.of(container_a)).build();
        val solution_a = Solution.builder().id("solution_a").elements(Set.of(system_a)).build();

        modelBuilder.elements(Set.of(solution_a, solution_b));

        val model = modelBuilder.build();
        val rawWorkspace = Workspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace, Collections.emptyMap());

        val metaLinks = metaLinkFinderForEgress.find(workspace.appIndex, "solution_a.system_a.container_a");
        log.info("solution_a.system_a.container_a {}", metaLinks);
        assertEquals(1, metaLinks.size());
        assertEquals(
            "solution_a.system_a.container_a",
            metaLinks.stream().findFirst().orElseThrow().getFromReference()
        );
        assertEquals("solution_b.system_b", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldFindInternalEgress() {
        val model = Fixtures.createWithInternalEgress().build();
        val rawWorkspace = Workspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace, Collections.emptyMap());

        val metaLinks = metaLinkFinderForEgress.find(workspace.appIndex, "sol_a.sys_aa");
        metaLinks.forEach(metaLink -> log.info("metaLink {}", metaLink));
        assertEquals(1, metaLinks.size());
        assertEquals("sol_a.sys_ab.con_aba", metaLinks.stream().findFirst().orElseThrow().getToReference());
        assertEquals("sol_a.sys_aa.con_aaa", metaLinks.stream().findFirst().orElseThrow().getFromReference());
    }

    @Test
    void shouldNotFindInternalIngress() {
        val model = Fixtures.createWithInternalIngress().build();
        val rawWorkspace = Workspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val metaLinks = metaLinkFinderForEgress.find(workspace.appIndex, "sol_a.sys_aa");
        metaLinks.forEach(metaLink -> log.info("metaLink {}", metaLink));
        assertEquals(0, metaLinks.size());
    }
}

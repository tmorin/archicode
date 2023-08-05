package io.morin.archicode.context.overview;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.Fixtures;
import io.morin.archicode.element.application.*;
import io.morin.archicode.element.application.System;
import io.morin.archicode.workspace.RawWorkspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
@Slf4j
class IngressMetaLinkFinderTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    IngressMetaLinkFinder ingressMetaLinkFinder;

    @Test
    void shouldFindSameItemLevel() {
        val modelBuilder = Application.builder();

        // solution_a.system_a.container_a -> solution_b.system_b.container_b
        val relationship = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val container_a = Container.builder().id("container_a").relationship(relationship).build();
        val system_a = System.builder().id("system_a").element(container_a).build();
        val solution_a = Solution.builder().id("solution_a").element(system_a).build();
        val container_b = Container.builder().id("container_b").build();
        val system_b = System.builder().id("system_b").element(container_b).build();
        val solution_b = Solution.builder().id("solution_b").element(system_b).build();
        modelBuilder.element(solution_a).element(solution_b);

        val model = modelBuilder.build();
        val rawWorkspace = RawWorkspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val metaLinks = ingressMetaLinkFinder.find(workspace, "solution_b.system_b.container_b");
        log.info("solution_b.system_b.container_b {}", metaLinks);
        assertEquals(1, metaLinks.size());
        assertEquals(
            "solution_a.system_a.container_a",
            metaLinks.stream().findFirst().orElseThrow().getFromReference()
        );
        assertEquals("solution_b.system_b.container_b", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldFindLowerItemLevel() {
        val modelBuilder = Application.builder();

        // solution_a.system_a -> solution_b.system_b.container_b
        val relationship = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val system_a = System.builder().id("system_a").relationship(relationship).build();
        val solution_a = Solution.builder().id("solution_a").element(system_a).build();
        val container_b = Container.builder().id("container_b").build();
        val system_b = System.builder().id("system_b").element(container_b).build();
        val solution_b = Solution.builder().id("solution_b").element(system_b).build();
        modelBuilder.element(solution_a).element(solution_b);

        val model = modelBuilder.build();
        val rawWorkspace = RawWorkspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val metaLinks = ingressMetaLinkFinder.find(workspace, "solution_b.system_b.container_b");
        log.info("solution_a.system_a {}", metaLinks);
        assertEquals(1, metaLinks.size());
        assertEquals("solution_a.system_a", metaLinks.stream().findFirst().orElseThrow().getFromReference());
        assertEquals("solution_b.system_b.container_b", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldFindUpperItemLevel() {
        val modelBuilder = Application.builder();

        // solution_a.system_a.container_a -> solution_b.system_b
        val relationship = Relationship.builder().destination("solution_b.system_b").build();
        val container_a = Container.builder().id("container_a").relationship(relationship).build();
        val system_a = System.builder().id("system_a").element(container_a).build();
        val solution_a = Solution.builder().id("solution_a").element(system_a).build();
        val system_b = System.builder().id("system_b").build();
        val solution_b = Solution.builder().id("solution_b").element(system_b).build();
        modelBuilder.element(solution_a).element(solution_b);

        val model = modelBuilder.build();
        val rawWorkspace = RawWorkspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val metaLinks = ingressMetaLinkFinder.find(workspace, "solution_b.system_b");
        log.info("solution_a.system_a.container_a {}", metaLinks);
        assertEquals(1, metaLinks.size());
        assertEquals(
            "solution_a.system_a.container_a",
            metaLinks.stream().findFirst().orElseThrow().getFromReference()
        );
        assertEquals("solution_b.system_b", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldNotFindInternalEgress() {
        val model = Fixtures.createWithInternalEgress().build();
        val rawWorkspace = RawWorkspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val metaLinks = ingressMetaLinkFinder.find(workspace, "sol_a.sys_aa");
        metaLinks.forEach(metaLink -> log.info("metaLink {}", metaLink));
        assertEquals(0, metaLinks.size());
    }

    @Test
    void shouldFindInternalIngress() {
        val model = Fixtures.createWithInternalIngress().build();
        val rawWorkspace = RawWorkspace.builder().application(model).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val metaLinks = ingressMetaLinkFinder.find(workspace, "sol_a.sys_aa");
        metaLinks.forEach(metaLink -> log.info("metaLink {}", metaLink));
        assertEquals(1, metaLinks.size());
        assertEquals("sol_a.sys_ab.con_aba", metaLinks.stream().findFirst().orElseThrow().getFromReference());
        assertEquals("sol_a.sys_aa.con_aaa", metaLinks.stream().findFirst().orElseThrow().getToReference());
    }
}
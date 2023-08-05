package io.morin.archicode.viewpoint.overview;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.Fixtures;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.metalink.EgressMetaLinkFinder;
import io.morin.archicode.viewpoint.metalink.IngressMetaLinkFinder;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
@Slf4j
class MetaLinkGroomerTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    EgressMetaLinkFinder egressMetaLinkFinder;

    @Inject
    IngressMetaLinkFinder ingressMetaLinkFinder;

    @Inject
    MetaLinkGroomer metaLinkGroomer;

    @Test
    void shouldGroomIngressMetaLinks() {
        val viewReference = "solution_a.system_a";

        val rawWorkspace = Workspace.builder().application(Fixtures.createWithIngress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val ingressMetaLinks = ingressMetaLinkFinder.find(workspace, viewReference);
        ingressMetaLinks.forEach(ingressMetaLink -> log.info("ingressMetaLink {}", ingressMetaLink));

        val groomedLinks = metaLinkGroomer.groomIngress(workspace, viewReference, ingressMetaLinks);
        groomedLinks.forEach(groomedLink -> log.info("groomedLink {}", groomedLink));

        assertEquals(1, groomedLinks.size());
        assertEquals("solution_c", groomedLinks.stream().findFirst().orElseThrow().getFromReference());
        assertEquals(viewReference, groomedLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldGroomEgressMetaLinks() {
        val viewReference = "solution_a.system_a";

        val rawWorkspace = Workspace.builder().application(Fixtures.createWithEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val egressMetaLinks = egressMetaLinkFinder.find(workspace, viewReference);
        egressMetaLinks.forEach(egressMetaLink -> log.info("egressMetaLink {}", egressMetaLink));

        val groomedLinks = metaLinkGroomer.groomEgress(workspace, viewReference, egressMetaLinks);
        groomedLinks.forEach(groomedLink -> log.info("groomedLink {}", groomedLink));

        assertEquals(1, groomedLinks.size());
        assertEquals(viewReference, groomedLinks.stream().findFirst().orElseThrow().getFromReference());
        assertEquals("solution_b", groomedLinks.stream().findFirst().orElseThrow().getToReference());
    }

    @Test
    void shouldGroomInternalEgressMetaLinks() {
        val viewReference = "sol_a.sys_aa.con_aaa";

        val rawWorkspace = Workspace.builder().application(Fixtures.createWithInternalEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val egressMetaLinks = egressMetaLinkFinder.find(workspace, viewReference);
        egressMetaLinks.forEach(egressMetaLink -> log.info("egressMetaLink {}", egressMetaLink));

        val groomedLinks = metaLinkGroomer.groomEgress(workspace, viewReference, egressMetaLinks);
        groomedLinks.forEach(groomedLink -> log.info("groomedLink {}", groomedLink));

        assertEquals(2, groomedLinks.size());
        assertEquals(
            viewReference,
            groomedLinks
                .stream()
                .filter(l -> l.getToReference().equals("sol_a.sys_ab"))
                .findFirst()
                .orElseThrow()
                .getFromReference()
        );
        assertEquals(
            viewReference,
            groomedLinks
                .stream()
                .filter(l -> l.getToReference().equals("sol_a.sys_aa.con_aab"))
                .findFirst()
                .orElseThrow()
                .getFromReference()
        );
    }

    @Test
    void shouldGroomInternalIngressMetaLinks() {
        val viewReference = "sol_a.sys_aa.con_aaa";

        val rawWorkspace = Workspace.builder().application(Fixtures.createWithInternalIngress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val ingressMetaLinks = ingressMetaLinkFinder.find(workspace, viewReference);
        ingressMetaLinks.forEach(ingressMetaLink -> log.info("ingressMetaLink {}", ingressMetaLink));

        val groomedLinks = metaLinkGroomer.groomIngress(workspace, viewReference, ingressMetaLinks);
        groomedLinks.forEach(groomedLink -> log.info("groomedLink {}", groomedLink));

        assertEquals(2, groomedLinks.size());
        assertEquals(
            viewReference,
            groomedLinks
                .stream()
                .filter(l -> l.getFromReference().equals("sol_a.sys_ab"))
                .findFirst()
                .orElseThrow()
                .getToReference()
        );
        assertEquals(
            viewReference,
            groomedLinks
                .stream()
                .filter(l -> l.getFromReference().equals("sol_a.sys_aa.con_aab"))
                .findFirst()
                .orElseThrow()
                .getToReference()
        );
    }
}

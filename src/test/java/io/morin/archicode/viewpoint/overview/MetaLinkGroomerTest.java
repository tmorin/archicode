package io.morin.archicode.viewpoint.overview;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.Fixtures;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.MetaLinkFinderForEgress;
import io.morin.archicode.viewpoint.MetaLinkFinderForIngress;
import io.morin.archicode.viewpoint.MetaLinkGroomer;
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

    MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();

    MetaLinkFinderForIngress metaLinkFinderForIngress = MetaLinkFinderForIngress.builder().build();

    MetaLinkGroomer metaLinkGroomer = MetaLinkGroomer.builder().build();

    @Test
    void shouldGroomIngressMetaLinks() {
        val viewReference = "solution_a.system_a";

        val rawWorkspace = Workspace.builder().application(Fixtures.createWithIngress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val ingressMetaLinks = metaLinkFinderForIngress.find(workspace.appIndex, viewReference);
        ingressMetaLinks.forEach(ingressMetaLink -> log.info("ingressMetaLink {}", ingressMetaLink));

        val groomedLinks = metaLinkGroomer.groomIngress(workspace.appIndex, viewReference, ingressMetaLinks);
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

        val egressMetaLinks = metaLinkFinderForEgress.find(workspace.appIndex, viewReference);
        egressMetaLinks.forEach(egressMetaLink -> log.info("egressMetaLink {}", egressMetaLink));

        val groomedLinks = metaLinkGroomer.groomEgress(workspace.appIndex, viewReference, egressMetaLinks);
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

        val egressMetaLinks = metaLinkFinderForEgress.find(workspace.appIndex, viewReference);
        egressMetaLinks.forEach(egressMetaLink -> log.info("egressMetaLink {}", egressMetaLink));

        val groomedLinks = metaLinkGroomer.groomEgress(workspace.appIndex, viewReference, egressMetaLinks);
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

        val ingressMetaLinks = metaLinkFinderForIngress.find(workspace.appIndex, viewReference);
        ingressMetaLinks.forEach(ingressMetaLink -> log.info("ingressMetaLink {}", ingressMetaLink));

        val groomedLinks = metaLinkGroomer.groomIngress(workspace.appIndex, viewReference, ingressMetaLinks);
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

package io.morin.archicode.context.overview;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.Fixtures;
import io.morin.archicode.view.OverviewView;
import io.morin.archicode.workspace.RawWorkspace;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Collections;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@QuarkusTest
@Slf4j
class OverviewContextFactoryTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    OverviewContextFactory contextFactory;

    @ParameterizedTest
    @ValueSource(strings = { "solution_a", "solution_a.system_a", "solution_a.system_a.container_a" })
    void shouldCreate(String viewReference) {
        val rawWorkspace = RawWorkspace.builder().application(Fixtures.createWithIngressAndEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Map.of());

        val view = OverviewView.builder().viewId("shouldCreate").element(viewReference).build();

        val context = contextFactory.create(workspace, view);
        assertEquals(3, context.getItems().size());
        assertEquals(2, context.getLinks().size());
        assertEquals(
            "solution_c",
            context
                .getLinks()
                .stream()
                .filter(l -> l.getTo().getReference().equals(viewReference))
                .findFirst()
                .orElseThrow()
                .getFrom()
                .getReference()
        );
        assertEquals(
            "solution_b",
            context
                .getLinks()
                .stream()
                .filter(l -> l.getFrom().getReference().equals(viewReference))
                .findFirst()
                .orElseThrow()
                .getTo()
                .getReference()
        );
    }

    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa.con_aaa" })
    void shouldCreateInternalLevel2(String viewReference) {
        val rawWorkspace = RawWorkspace.builder().application(Fixtures.createWithInternalXgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Collections.emptyMap());
        val view = OverviewView.builder().viewId("shouldCreateInternalLevel2").element(viewReference).build();
        val context = contextFactory.create(workspace, view);
        assertEquals(1, context.getItems().size());
        assertEquals(4, context.getLinks().size());
        assertTrue(
            context
                .getLinks()
                .stream()
                .filter(l -> l.getFrom().getReference().equals(viewReference))
                .anyMatch(l -> l.getTo().getReference().equals("sol_a.sys_ab")),
            "sol_a.sys_aa.con_aaa -> sol_a.sys_ab"
        );
        assertTrue(
            context
                .getLinks()
                .stream()
                .filter(l -> l.getFrom().getReference().equals(viewReference))
                .anyMatch(l -> l.getTo().getReference().equals("sol_a.sys_aa.con_aab")),
            "sol_a.sys_aa.con_aaa -> sol_a.sys_aa.con_aab"
        );
        assertTrue(
            context
                .getLinks()
                .stream()
                .filter(l -> l.getFrom().getReference().equals("sol_a.sys_ab"))
                .anyMatch(l -> l.getTo().getReference().equals(viewReference)),
            "sol_a.sys_ab -> sol_a.sys_aa.con_aaa"
        );
        assertTrue(
            context
                .getLinks()
                .stream()
                .filter(l -> l.getFrom().getReference().equals("sol_a.sys_aa.con_aab"))
                .anyMatch(l -> l.getTo().getReference().equals(viewReference)),
            "sol_a.sys_aa.con_aab -> sol_a.sys_aa.con_aaa"
        );
    }

    @ParameterizedTest
    @ValueSource(strings = { "sol_a.sys_aa" })
    void shouldCreateInternalLevel1(String viewReference) {
        val rawWorkspace = RawWorkspace.builder().application(Fixtures.createInternalEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace, Collections.emptyMap());
        val view = OverviewView.builder().viewId("shouldCreateInternalLevel1").element(viewReference).build();
        val context = contextFactory.create(workspace, view);
        assertEquals(1, context.getItems().size());
        assertTrue(
            context
                .getLinks()
                .stream()
                .filter(l -> l.getFrom().getReference().equals(viewReference))
                .anyMatch(l -> l.getTo().getReference().equals("sol_a.sys_ab")),
            "sol_a.sys_aa -> sol_a.sys_ab"
        );
    }
}

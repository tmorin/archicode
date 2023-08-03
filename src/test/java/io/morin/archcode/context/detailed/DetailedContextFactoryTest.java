package io.morin.archcode.context.detailed;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archcode.Fixtures;
import io.morin.archcode.view.DetailedView;
import io.morin.archcode.workspace.RawWorkspace;
import io.morin.archcode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
@Slf4j
class DetailedContextFactoryTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    DetailedContextFactory contextFactory;

    @Test
    void shouldCreate() {
        val viewReference = "solution_a.system_a";

        val rawWorkspace = RawWorkspace.builder().application(Fixtures.createWithIngressAndEgress().build()).build();
        val workspace = workspaceFactory.create(rawWorkspace);

        val view = DetailedView.builder().viewId("shouldCreate").element(viewReference).build();

        val context = contextFactory.create(workspace, view);
        assertEquals(3, context.getItems().size());
        assertEquals(2, context.getLinks().size());
    }
}

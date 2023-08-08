package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.Workspace;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

@Slf4j
class ItemRendererForAtomicTest {

    Solution.SolutionBuilder elementBuilder;

    Workspace workspace;
    Viewpoint viewpoint;

    @BeforeEach
    void setUp() {
        workspace = Mockito.mock(Workspace.class);
        viewpoint = Mockito.mock(Viewpoint.class);
        Mockito.when(viewpoint.getWorkspace()).thenReturn(workspace);
        Mockito.when(workspace.getFormatters()).thenReturn(Formatters.builder().build());

        elementBuilder = Solution.builder().id("item_id");
    }

    @Test
    void shouldRender() {
        val element = elementBuilder.build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(viewpoint, item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                rectangle item_id <<solution>> <<atomic>> [
                item_id
                [solution]
                ]
                """,
            puml
        );
    }

    @Test
    void shouldRenderWithName() {
        val element = elementBuilder.name("Name").build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(viewpoint, item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                rectangle item_id <<solution>> <<atomic>> [
                Name
                [solution]
                ]
                """,
            puml
        );
    }

    @Test
    void shouldRenderWithQualifier() {
        val element = elementBuilder.build();
        element.getQualifiers().add("q1");
        element.getQualifiers().add("q2");
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(viewpoint, item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                rectangle item_id <<q1>> <<q2>> <<solution>> <<atomic>> [
                item_id
                [solution: q1, q2]
                ]
                """,
            puml
        );
    }

    @Test
    void shouldRenderWithDescription() {
        val element = elementBuilder.description("description").build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(viewpoint, item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                    rectangle item_id <<solution>> <<atomic>> [
                    item_id
                    [solution]
                    description
                    ]
                    """,
            puml
        );
    }
}

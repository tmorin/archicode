package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.Workspace;
import java.util.List;
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
        val puml = ItemRenderer.AtomicItemRenderer.builder()
            .build()
            .render(viewpoint, PlantumlNames.of(viewpoint), item);
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
        val puml = ItemRenderer.AtomicItemRenderer.builder()
            .build()
            .render(viewpoint, PlantumlNames.of(viewpoint), item);
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
        val item = ViewpointFixtures.createItemBuilder(element).stereotypes(List.of("q1", "q2")).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder()
            .build()
            .render(viewpoint, PlantumlNames.of(viewpoint), item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
            rectangle item_id <<q2>> <<q1>> <<solution>> <<atomic>> [
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
        val puml = ItemRenderer.AtomicItemRenderer.builder()
            .build()
            .render(viewpoint, PlantumlNames.of(viewpoint), item);
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

    @Test
    void shouldRenderEveryStereotypeTheKernelTellsLastFirstSoThatTheLastOneWins() {
        // `rendering-stereotypes: "external changed"` is two stereotypes, each one a key `styles` can style;
        // PlantUML lets the first stereotype of a box win, the editor lets the last one win
        val element = elementBuilder.build();
        val item = ViewpointFixtures.createItemBuilder(element)
            .stereotypes(List.of("Spring Boot", "external", "changed"))
            .build();
        val puml = ItemRenderer.AtomicItemRenderer.builder()
            .build()
            .render(viewpoint, PlantumlNames.of(viewpoint), item);
        Assertions.assertTrue(
            puml.startsWith("rectangle item_id <<changed>> <<external>> <<Spring Boot>> <<solution>> <<atomic>> [\n"),
            puml
        );
        Assertions.assertFalse(puml.contains("external changed"), puml);
    }

    @Test
    void shouldNameABoxWithAHyphenInItsIdWithANameThatPlantumlReadsAndKeepTheIdInItsLabel() {
        val element = Solution.builder().id("shop.report-a").build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder()
            .build()
            .render(viewpoint, PlantumlNames.of(viewpoint), item);
        Assertions.assertEquals(
            """
            rectangle shop.report_a <<solution>> <<atomic>> [
            shop.report-a
            [solution]
            ]
            """,
            puml
        );
    }
}

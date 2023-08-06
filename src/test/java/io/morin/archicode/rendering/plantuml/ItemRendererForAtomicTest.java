package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Solution;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@Slf4j
class ItemRendererForAtomicTest {

    Solution.SolutionBuilder elementBuilder;

    @BeforeEach
    void setUp() {
        elementBuilder = Solution.builder().id("item_id");
    }

    @Test
    void shouldRender() {
        val element = elementBuilder.build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                rectangle item_id <<solution>> <<atomic>> [
                **item_id**
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
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                rectangle item_id <<solution>> <<atomic>> [
                **Name**
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
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                rectangle item_id <<q1>> <<q2>> <<solution>> <<atomic>> [
                **item_id**
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
        val puml = ItemRenderer.AtomicItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                    rectangle item_id <<solution>> <<atomic>> [
                    **item_id**
                    [solution]
                    description
                    ]
                    """,
            puml
        );
    }
}

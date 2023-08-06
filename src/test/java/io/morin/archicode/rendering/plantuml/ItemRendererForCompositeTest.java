package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.element.application.System;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@Slf4j
class ItemRendererForCompositeTest {

    Solution.SolutionBuilder<?, ?> solutionBuilder;

    @BeforeEach
    void setUp() {
        solutionBuilder = Solution.builder().id("sol_id");
    }

    @Test
    void shouldRender() {
        val element = solutionBuilder.build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.CompositeItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                        rectangle sol_id as "sol_id\\n[solution]" <<composite>> {
                        }
                        """,
            puml
        );
    }

    @Test
    void shouldRenderWithName() {
        val element = solutionBuilder.name("Name").build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.CompositeItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                        rectangle sol_id as "Name\\n[solution]" <<composite>> {
                        }
                        """,
            puml
        );
    }

    @Test
    void shouldRenderWithQualifier() {
        val element = solutionBuilder.build();
        element.getQualifiers().add("q1");
        element.getQualifiers().add("q2");
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.CompositeItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                        rectangle sol_id as "sol_id\\n[solution: q1, q2]" <<composite>> <<q1>> <<q2>> {
                        }
                        """,
            puml
        );
    }

    @Test
    void shouldRenderWithElements() {
        val system = System.builder().id("sys_id").build();
        val element = solutionBuilder.elements(Set.of(system)).build();
        val item = ViewpointFixtures.createItemBuilder(element).build();
        val puml = ItemRenderer.CompositeItemRenderer.builder().build().render(item);
        log.info("linkAsPuml {}", puml);
        Assertions.assertEquals(
            """
                        rectangle sol_id as "sol_id\\n[solution]" <<composite>> {
                        rectangle sys_id <<system>> <<atomic>> [
                        **sys_id**
                        [system]
                        ]
                        }
                        """,
            puml
        );
    }
}

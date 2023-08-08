package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.Workspace;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

@Slf4j
class LinkRendererTest {

    Element fromElement;
    Item fromItem;

    Element toElement;
    Item toItem;

    Workspace workspace;
    Viewpoint viewpoint;

    @BeforeEach
    void setUp() {
        workspace = Mockito.mock(Workspace.class);
        viewpoint = Mockito.mock(Viewpoint.class);
        Mockito.when(viewpoint.getWorkspace()).thenReturn(workspace);
        Mockito.when(workspace.getFormatters()).thenReturn(Formatters.builder().build());

        fromElement = Solution.builder().id("from").build();
        fromItem = ViewpointFixtures.createItem(fromElement);

        toElement = Solution.builder().id("to").build();
        toItem = ViewpointFixtures.createItem(toElement);
    }

    @Test
    void render() {
        val link = Link.builder().from(fromItem).to(toItem).build();
        val puml = LinkRenderer.builder().build().render(viewpoint, link);
        log.info("puml {}", puml);
        Assertions.assertEquals("from --> to\n", puml);
    }

    @Test
    void renderWithLabel() {
        val link = Link.builder().from(fromItem).to(toItem).label("label").build();
        val puml = LinkRenderer.builder().build().render(viewpoint, link);
        log.info("puml {}", puml);
        Assertions.assertEquals("from --> to : label\n", puml);
    }

    @Test
    void renderWithQualifier() {
        val link = Link.builder().from(fromItem).to(toItem).build();
        link.getQualifiers().add("q1");
        link.getQualifiers().add("q2");
        val puml = LinkRenderer.builder().build().render(viewpoint, link);
        log.info("puml {}", puml);
        Assertions.assertEquals("from --> to : [q1, q2]\n", puml);
    }

    @Test
    void renderWithLabelAndQualifier() {
        val link = Link.builder().from(fromItem).to(toItem).label("label").build();
        link.getQualifiers().add("q1");
        link.getQualifiers().add("q2");
        val puml = LinkRenderer.builder().build().render(viewpoint, link);
        log.info("puml {}", puml);
        Assertions.assertEquals("from --> to : label\\n[q1, q2]\n", puml);
    }
}

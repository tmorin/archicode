package io.morin.archicode.rendering.plantuml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.Workspace;
import java.util.Map;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The styles a diagram opens with: the atomic and the composite boxes, and the box of a stereotype, with or without a shadow. */
class StyleRenderersTest {

    private static final String NL = System.lineSeparator();

    private static Viewpoint viewpointWith(Styles styles) {
        val workspace = mock(Workspace.class);
        when(workspace.getStyles()).thenReturn(styles);
        val viewpoint = mock(Viewpoint.class);
        when(viewpoint.getWorkspace()).thenReturn(workspace);
        return viewpoint;
    }

    @Test
    void shouldStyleTheAtomicBoxesWhenTheWorkspaceSaysHow() {
        val styles = Styles.builder()
            .atomic(Styles.Style.builder().backgroundColor("white").lineColor("black").roundCorner(8).build())
            .build();

        val puml = StyleRenderer.builder().build().render(viewpointWith(styles));

        assertTrue(
            puml.contains(
                "<style>" +
                    NL +
                    ".atomic {" +
                    NL +
                    "BackgroundColor: white" +
                    NL +
                    "LineColor: black" +
                    NL +
                    "RoundCorner: 8" +
                    NL +
                    "}" +
                    NL +
                    ".composite {"
            ),
            puml
        );
        assertTrue(puml.endsWith("</style>" + NL), puml);
    }

    @Test
    void shouldStyleOnlyTheCompositeBoxesByDefault() {
        val puml = StyleRenderer.builder().build().render(viewpointWith(Styles.builder().build()));

        assertTrue(!puml.contains(".atomic {"), puml);
        assertTrue(puml.contains(".composite {" + NL + "BackgroundColor: transparent" + NL), puml);
    }

    @Test
    void shouldAddTheShadowOfAStereotypeBeforeItsStyle() {
        val style = Styles.Style.builder().backgroundColor("lightgray").shadowing(true).build();

        val puml = StyleShapeRenderer.builder().build().render("rectangle", Map.entry("database", style));

        assertEquals(
            "skinparam rectangleShadowing<<database>> true" +
                NL +
                "<style>" +
                NL +
                ".database {" +
                NL +
                "rectangle {" +
                NL +
                "BackgroundColor: lightgray" +
                NL +
                "}" +
                NL +
                "}" +
                NL +
                "</style>" +
                NL,
            puml
        );
    }

    @Test
    void shouldAddNoShadowWhenTheStyleHasNone() {
        val style = Styles.Style.builder().lineColor("red").build();

        val puml = StyleShapeRenderer.builder().build().render("rectangle", Map.entry("database", style));

        assertTrue(puml.startsWith("<style>" + NL), puml);
        assertTrue(!puml.contains("Shadowing"), puml);
    }
}

package io.morin.archicode.rendering.plantuml;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.Workspace;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * How a link that stands for a highlighted relationship is drawn in PlantUML, and how the other links are drawn calmer (wave
 * 026, run 0198, issue #143; DEC-5 of the TDD). A view is "highlighting" when at least one of the links of its viewpoint is
 * highlighted; the renderer finds it from {@code Viewpoint#getLinks()}, so each case below puts a second link in the viewpoint,
 * highlighted or not. The expected text is a golden string: colour is never alone, the weight (5 against the 3 of {@code new}),
 * the glyph {@code U+25B6} and the bold label tell the highlight, and a state keeps its colour, its dash and its own glyph.
 */
class HighlightMarksTest {

    private static final String GLYPH = "**<U+25B6>**";

    Workspace workspace;
    Item from;
    Item to;

    @BeforeEach
    void setUp() {
        workspace = Mockito.mock(Workspace.class);
        Mockito.when(workspace.getFormatters()).thenReturn(Formatters.builder().build());
        from = ViewpointFixtures.createItem(Solution.builder().id("from").build());
        to = ViewpointFixtures.createItem(Solution.builder().id("to").build());
    }

    private Link link(Change change, boolean highlighted, String label, boolean secondary, String... qualifiers) {
        Map<String, String> tags = secondary ? Map.of("rendering-secondary", "no") : new LinkedHashMap<>();
        return Link.builder()
            .from(from)
            .to(to)
            .label(label)
            .qualifiers(new LinkedHashSet<>(List.of(qualifiers)))
            .tags(tags)
            .change(change)
            .highlighted(highlighted)
            .build();
    }

    /** The link as the renderer writes it in a view whose links are these ones (the link drawn is the first). */
    private String render(boolean compared, Link link, Link... others) {
        val viewpoint = Mockito.mock(Viewpoint.class);
        Mockito.when(viewpoint.getWorkspace()).thenReturn(workspace);
        Mockito.when(viewpoint.isCompared()).thenReturn(compared);
        val links = new LinkedHashSet<Link>();
        links.add(link);
        links.addAll(List.of(others));
        Mockito.when(viewpoint.getLinks()).thenReturn(links);
        return LinkRenderer.builder().build().render(viewpoint, PlantumlNames.of(viewpoint), link);
    }

    /** A link that is highlighted, so that the view is highlighting whatever the link drawn is. */
    private Link heavy() {
        return link(Change.NONE, true, "other", false);
    }

    @Test
    void aHighlightedLinkIsHeavyWithAGlyphAndABoldLabel() {
        assertEquals(
            "from -[thickness=5,#D55E00]-> to : " + GLYPH + " **reads**\n",
            render(false, link(Change.NONE, true, "reads", false))
        );
        // a link that compares nothing says no state, whatever the item says
        assertEquals(
            "from -[thickness=5,#D55E00]-> to : " + GLYPH + " **reads**\n",
            render(false, link(Change.NEW, true, "reads", false))
        );
        // compared, but not changed
        assertEquals(
            "from -[thickness=5,#D55E00]-> to : " + GLYPH + " **reads**\n",
            render(true, link(Change.NONE, true, "reads", false))
        );
    }

    @Test
    void aHighlightedLinkWithNoLabelHasTheGlyphAlone() {
        assertEquals(
            "from -[thickness=5,#D55E00]-> to : " + GLYPH + "\n",
            render(false, link(Change.NONE, true, null, false))
        );
        assertEquals(
            "from -[thickness=5,#D55E00]-> to : " + GLYPH + "\n",
            render(false, link(Change.NONE, true, " ", false))
        );
    }

    @Test
    void theBoldCoversTheLabelAndNotTheQualifiers() {
        assertEquals(
            "from -[thickness=5,#D55E00]-> to : " + GLYPH + " **reads**\\n[REST]\n",
            render(false, link(Change.NONE, true, "reads", false, "REST"))
        );
    }

    @Test
    void aHighlightedNewLinkKeepsItsColourAndItsGlyphAndGainsTheWeight() {
        assertEquals(
            "from -[thickness=5,#009E73]-> to : **+** " + GLYPH + " **reads**\n",
            render(true, link(Change.NEW, true, "reads", false))
        );
    }

    @Test
    void aHighlightedChangedLinkStaysDotted() {
        assertEquals(
            "from -[dotted,thickness=5,#E69F00]-> to : **<U+007E>** " + GLYPH + " **reads**\n",
            render(true, link(Change.CHANGED, true, "reads", false))
        );
    }

    @Test
    void aHighlightedRemovedLinkStaysDashedAndGrey() {
        assertEquals(
            "from -[dashed,thickness=5,#7F7F7F]-> to : **<U+2212>** " + GLYPH + " **reads**\n",
            render(true, link(Change.REMOVED, true, "reads", false))
        );
        assertEquals(
            "from -[dashed,thickness=5,#7F7F7F]-> to : **<U+2212>** " + GLYPH + "\n",
            render(true, link(Change.REMOVED, true, null, false))
        );
    }

    @Test
    void aLinkThatIsNotHighlightedIsCalmInAHighlightingView() {
        assertEquals(
            "from -[#A6A6A6]-> to : <color:#7F7F7F>reads</color>\n",
            render(false, link(Change.NONE, false, "reads", false), heavy())
        );
        // a calm link with no label has no description
        assertEquals("from -[#A6A6A6]-> to\n", render(false, link(Change.NONE, false, null, false), heavy()));
        // compared, not changed: calm too
        assertEquals(
            "from -[#A6A6A6]-> to : <color:#7F7F7F>reads</color>\n",
            render(true, link(Change.NONE, false, "reads", false), heavy())
        );
    }

    @Test
    void aLinkWithAStateThatIsNotHighlightedKeepsItsStateInAHighlightingView() {
        assertEquals(
            "from -[thickness=3,#009E73]-> to : **+** reads\n",
            render(true, link(Change.NEW, false, "reads", false), heavy())
        );
        assertEquals(
            "from -[dotted,thickness=2,#E69F00]-> to : **<U+007E>** reads\n",
            render(true, link(Change.CHANGED, false, "reads", false), heavy())
        );
        assertEquals(
            "from -[dashed,#7F7F7F]-> to : **<U+2212>** reads\n",
            render(true, link(Change.REMOVED, false, "reads", false), heavy())
        );
    }

    @Test
    void aSecondaryLinkIsDrawnAsWithoutTheHighlight() {
        assertEquals("from ..[#gray]> to : reads\n", render(false, link(Change.NONE, false, "reads", true), heavy()));
    }

    @Test
    void aViewWithNoHighlightedLinkIsDrawnAsItAlwaysWas() {
        val other = link(Change.NONE, false, "other", false);
        assertEquals("from --> to : reads\n", render(false, link(Change.NONE, false, "reads", false), other));
        assertEquals("from --> to\n", render(false, link(Change.NONE, false, null, false), other));
        assertEquals(
            "from -[thickness=3,#009E73]-> to : **+** reads\n",
            render(true, link(Change.NEW, false, "reads", false), other)
        );
        assertEquals("from ..[#gray]> to : reads\n", render(false, link(Change.NONE, false, "reads", true), other));
    }

    @Test
    void theViewIsHighlightingWheneverAnyOfItsLinksIsHighlighted() {
        val calm = link(Change.NONE, false, "reads", false);
        val marked = Set.of(link(Change.NONE, true, "writes", false));
        val viewpoint = Mockito.mock(Viewpoint.class);
        Mockito.when(viewpoint.getWorkspace()).thenReturn(workspace);
        Mockito.when(viewpoint.getLinks()).thenReturn(marked);
        assertEquals(
            "from -[#A6A6A6]-> to : <color:#7F7F7F>reads</color>\n",
            LinkRenderer.builder().build().render(viewpoint, PlantumlNames.of(viewpoint), calm)
        );
    }
}

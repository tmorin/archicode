package io.morin.archicode.rendering.plantuml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.workspace.Formatters;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.workspace.Workspace;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * How the views of a comparison tell what changed, in PlantUML: a glyph in the label, a line style, never colour alone,
 * and the author's style winning property by property over the default one.
 */
class ChangeMarksTest {

    Workspace workspace;
    Viewpoint compared;
    Viewpoint plain;

    @BeforeEach
    void setUp() {
        workspace = Mockito.mock(Workspace.class);
        Mockito.when(workspace.getFormatters()).thenReturn(Formatters.builder().build());
        compared = Mockito.mock(Viewpoint.class);
        Mockito.when(compared.getWorkspace()).thenReturn(workspace);
        Mockito.when(compared.isCompared()).thenReturn(true);
        plain = Mockito.mock(Viewpoint.class);
        Mockito.when(plain.getWorkspace()).thenReturn(workspace);
    }

    private Item item(String id, Change change, String... stereotypes) {
        return ViewpointFixtures.createItemBuilder(Solution.builder().id(id).name(id.toUpperCase()).build())
            .change(change)
            .stereotypes(List.of(stereotypes))
            .build();
    }

    private String atomic(Viewpoint viewpoint, Item item) {
        return ItemRenderer.AtomicItemRenderer.builder().build().render(viewpoint, item);
    }

    @Test
    void aBoxSaysItsStateInItsStereotypesAndWithAGlyphInItsTitle() {
        assertEquals(
            "rectangle a <<new>> <<solution>> <<atomic>> [\n+ A\n[solution]\n]\n",
            atomic(compared, item("a", Change.NEW, "new"))
        );
        assertEquals(
            "rectangle a <<changed>> <<solution>> <<atomic>> [\n<U+007E> A\n[solution]\n]\n",
            atomic(compared, item("a", Change.CHANGED, "changed"))
        );
        // a removed box has its title struck, as well
        assertEquals(
            "rectangle a <<removed>> <<solution>> <<atomic>> [\n<U+2212> --A--\n[solution]\n]\n",
            atomic(compared, item("a", Change.REMOVED, "removed"))
        );
        // the container of changes: its own state is none, the marker is what the kernel put last
        assertEquals(
            "rectangle a <<contains-changes>> <<solution>> <<atomic>> [\n<U+00B1> A\n[solution]\n]\n",
            atomic(compared, item("a", Change.NONE, "contains-changes"))
        );
    }

    @Test
    void theGlyphGoesInsideTheFormatOfTheTitle() {
        Mockito.when(workspace.getFormatters()).thenReturn(
            Formatters.builder().atomic(Formatters.AtomicFormatter.builder().name("**%s**").build()).build()
        );
        assertTrue(atomic(compared, item("a", Change.NEW, "new")).contains("\n**+ A**\n"));
        assertTrue(atomic(compared, item("a", Change.REMOVED, "removed")).contains("\n**<U+2212> --A--**\n"));
    }

    @Test
    void aBoxThatDidNotChangeIsDrawnAsItAlwaysWas() {
        assertEquals(
            "rectangle a <<solution>> <<atomic>> [\nA\n[solution]\n]\n",
            atomic(compared, item("a", Change.NONE))
        );
    }

    @Test
    void aViewThatComparesNothingIgnoresWhatTheItemsSay() {
        // the viewpoint, not the item, says whether the view is a comparison
        assertEquals(
            "rectangle a <<new>> <<solution>> <<atomic>> [\nA\n[solution]\n]\n",
            atomic(plain, item("a", Change.NEW, "new"))
        );
    }

    @Test
    void aCompositeBoxHasTheGlyphInItsLabel() {
        val parent = item("p", Change.NONE, "contains-changes");
        val child = item("c", Change.NEW, "new");
        parent.getChildren().add(child);
        val puml = ItemRenderer.builder().build().render(compared, parent);
        assertTrue(
            puml.startsWith("rectangle p as \"<U+00B1> P\\n[solution]\" <<contains-changes>> <<composite>> {\n"),
            puml
        );
        assertTrue(puml.contains("rectangle c <<new>> <<solution>> <<atomic>> [\n+ C\n"), puml);
    }

    private Link link(Change change, String label, String... qualifiers) {
        return Link.builder()
            .from(item("from", Change.NONE))
            .to(item("to", Change.NONE))
            .label(label)
            .qualifiers(new java.util.LinkedHashSet<>(List.of(qualifiers)))
            .change(change)
            .build();
    }

    @Test
    void aLinkHasALineStyleAndAGlyphInItsLabel() {
        val renderer = LinkRenderer.builder().build();
        assertEquals(
            "from -[thickness=3,#009E73]-> to : **+** reads\n",
            renderer.render(compared, link(Change.NEW, "reads"))
        );
        assertEquals(
            "from -[dotted,thickness=2,#E69F00]-> to : **<U+007E>** reads\\n[REST]\n",
            renderer.render(compared, link(Change.CHANGED, "reads", "REST"))
        );
        assertEquals(
            "from -[dashed,#7F7F7F]-> to : **<U+2212>** reads\n",
            renderer.render(compared, link(Change.REMOVED, "reads"))
        );
        // a link without a label has the glyph alone
        assertEquals(
            "from -[dashed,#7F7F7F]-> to : **<U+2212>**\n",
            renderer.render(compared, link(Change.REMOVED, null))
        );
        // and a link that did not change, or a view that compares nothing, is what it always was
        assertEquals("from --> to : reads\n", renderer.render(compared, link(Change.NONE, "reads")));
        assertEquals("from --> to : reads\n", renderer.render(plain, link(Change.NEW, "reads")));
    }

    private static Styles.Style style(String key, Map<String, Styles.Style> styles) {
        return styles.get(key);
    }

    @Test
    void theDefaultStylesTellTheStatesWithLinesAndNotWithColourAlone() {
        val newStyle = ChangeMarks.style("new");
        assertEquals(0, newStyle.getLineStyle(), "solid");
        assertEquals(3, newStyle.getLineThickness(), "thick");
        assertEquals(2, ChangeMarks.style("changed").getLineStyle(), "dotted");
        val removed = ChangeMarks.style("removed");
        assertEquals(7, removed.getLineStyle(), "dashed");
        assertEquals("#7F7F7F", removed.getFontColor(), "a grey title");
        val container = ChangeMarks.style("contains-changes");
        assertEquals(4, container.getLineStyle(), "dashed");
        assertEquals(1, container.getLineThickness(), "thin");
    }

    @Test
    void theAuthorsStyleOfTheSameNameWinsPropertyByProperty() {
        val defaults = Map.of("new", ChangeMarks.style("new"), "removed", ChangeMarks.style("removed"));
        val styles = Styles.builder()
            .byTag("removed", Styles.Style.builder().lineColor("red").lineThickness(1).build())
            .byQualifier("new", Styles.Style.builder().backgroundColor("lightgreen").build())
            .byTag("new", Styles.Style.builder().lineColor("green").build())
            .build();
        val merged = PlantumlUtilities.stereotypeStyles(styles, defaults)
            .stream()
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        // removed: the author's colour and thickness over the default's dashes, fill and grey title
        assertEquals("red", style("removed", merged).getLineColor());
        assertEquals(1, style("removed", merged).getLineThickness());
        assertEquals(7, style("removed", merged).getLineStyle());
        assertEquals("#EEEEEE", style("removed", merged).getBackgroundColor());
        assertEquals("#7F7F7F", style("removed", merged).getFontColor());
        // new: by-qualifiers over the default, then by-tags over both
        assertEquals("lightgreen", style("new", merged).getBackgroundColor());
        assertEquals("green", style("new", merged).getLineColor());
        assertEquals(0, style("new", merged).getLineStyle());
        assertEquals(3, style("new", merged).getLineThickness());
        // without defaults the styles are the author's, as they always were
        assertEquals(
            List.of("new", "removed"),
            PlantumlUtilities.stereotypeStyles(styles).stream().map(Map.Entry::getKey).toList()
        );
        assertEquals("green", PlantumlUtilities.stereotypeStyles(styles).get(0).getValue().getLineColor());
    }

    @Test
    void aStateWrittenByHandOnABoxThatDoesNotHaveItKeepsItsPlaceUnderAnotherNameAndTheStateComputedDoesNot() {
        // did not change: the word is the author's
        assertEquals(List.of("written-new"), ChangeMarks.stereotypes(compared, item("a", Change.NONE, "new")));
        // the state of the box is the last stereotype, and is not renamed; the word of the author before it is
        assertEquals(
            List.of("Redis", "written-new", "changed"),
            ChangeMarks.stereotypes(compared, item("a", Change.CHANGED, "Redis", "new", "changed"))
        );
        // the author wrote the state the box has: one word, the state
        assertEquals(List.of("new"), ChangeMarks.stereotypes(compared, item("a", Change.NEW, "new")));
        // the states of the identity too
        assertEquals(List.of("written-moved"), ChangeMarks.stereotypes(compared, item("a", Change.NONE, "moved")));
        assertEquals(List.of("moved"), ChangeMarks.stereotypes(compared, item("a", Change.MOVED, "moved")));
        // a word that is no state is left alone, and so is everything in a view that compares nothing
        assertEquals(List.of("external"), ChangeMarks.stereotypes(compared, item("a", Change.NONE, "external")));
        assertEquals(List.of("new"), ChangeMarks.stereotypes(plain, item("a", Change.NONE, "new")));
        assertEquals(List.of("new"), ChangeMarks.stereotypes(plain, item("a", Change.NEW, "new")));
    }

    @Test
    void theAuthorsStyleOfAWrittenStateIsTheirOwnWithoutTheDefaultLook() {
        val defaults = Map.of("new", ChangeMarks.style("new"));
        val styles = Styles.builder()
            .byQualifier("new", Styles.Style.builder().backgroundColor("lightgreen").build())
            .byTag("new", Styles.Style.builder().lineColor("green").build())
            .build();
        val entries = PlantumlUtilities.stereotypeStyles(styles, defaults, Set.of("new", "changed"))
            .stream()
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        // the state keeps the default look under the author's
        assertEquals(3, entries.get("new").getLineThickness());
        // the written word has the author's style, both maps merged, and nothing of the default
        val written = entries.get("written-new");
        assertEquals("green", written.getLineColor());
        assertEquals("lightgreen", written.getBackgroundColor());
        assertEquals(null, written.getLineThickness());
        assertEquals(null, written.getLineStyle());
        // no style of the author, no style for the written word
        assertFalse(entries.containsKey("written-changed"));
    }

    @Test
    void aViewKnowsTheStatesItHasWrittenByHand() {
        val counter = item("c", Change.NONE, "new");
        val kiosk = item("k", Change.NEW, "new");
        val printer = item("p", Change.CHANGED, "new", "changed");
        Mockito.when(compared.getItems()).thenReturn(Set.of(counter, kiosk, printer));
        assertEquals(Set.of("new"), ChangeMarks.writtenStates(compared));
        Mockito.when(plain.getItems()).thenReturn(Set.of(counter));
        assertTrue(ChangeMarks.writtenStates(plain).isEmpty());
    }

    @Test
    void onlyTheStatesAViewUsesGetADefaultStyleAndALegend() {
        val none = ViewpointFixtures.createItem(Solution.builder().id("a").build());
        Mockito.when(compared.getItems()).thenReturn(Set.of(none));
        Mockito.when(compared.getLinks()).thenReturn(Set.of());
        assertTrue(ChangeMarks.styles(compared).isEmpty());
        assertEquals("", ChangeMarks.legend(compared), "nothing changed in the view: nothing to explain");

        val removed = item("r", Change.REMOVED, "removed");
        Mockito.when(compared.getItems()).thenReturn(Set.of(none, removed));
        Mockito.when(compared.getLinks()).thenReturn(Set.of(link(Change.NEW, "x")));
        assertEquals(List.of("new", "removed"), List.copyOf(ChangeMarks.styles(compared).keySet()));
        val legend = ChangeMarks.legend(compared);
        assertTrue(legend.startsWith("legend right\n"), legend);
        assertTrue(legend.endsWith("endlegend\n"), legend);
        // the four states, so that a reader learns the language, and the plateaus compared when the workspace knows them
        assertTrue(legend.contains("| **<U+00B1>** | something inside changed: thin dashed outline | |"), legend);
        assertFalse(legend.contains("compared with"), legend);
        Mockito.when(workspace.getPlateau()).thenReturn(Settings.Plateau.builder().id("to-be").name("To be").build());
        Mockito.when(workspace.getBaseline()).thenReturn(Settings.Plateau.builder().id("as-is").build());
        assertTrue(ChangeMarks.legend(compared).contains("**To be** compared with **as-is**\n"));

        assertEquals(Optional.empty(), ChangeMarks.stateOf(plain, removed));
    }
}

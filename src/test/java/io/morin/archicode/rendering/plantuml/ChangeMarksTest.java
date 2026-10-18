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
        return ItemRenderer.AtomicItemRenderer.builder().build().render(viewpoint, PlantumlNames.of(viewpoint), item);
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
        val puml = ItemRenderer.builder().build().render(compared, PlantumlNames.of(compared), parent);
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
            renderer.render(compared, PlantumlNames.of(compared), link(Change.NEW, "reads"))
        );
        assertEquals(
            "from -[dotted,thickness=2,#E69F00]-> to : **<U+007E>** reads\\n[REST]\n",
            renderer.render(compared, PlantumlNames.of(compared), link(Change.CHANGED, "reads", "REST"))
        );
        assertEquals(
            "from -[dashed,#7F7F7F]-> to : **<U+2212>** reads\n",
            renderer.render(compared, PlantumlNames.of(compared), link(Change.REMOVED, "reads"))
        );
        // a link without a label has the glyph alone
        assertEquals(
            "from -[dashed,#7F7F7F]-> to : **<U+2212>**\n",
            renderer.render(compared, PlantumlNames.of(compared), link(Change.REMOVED, null))
        );
        // and a link that did not change, or a view that compares nothing, is what it always was
        assertEquals(
            "from --> to : reads\n",
            renderer.render(compared, PlantumlNames.of(compared), link(Change.NONE, "reads"))
        );
        assertEquals(
            "from --> to : reads\n",
            renderer.render(plain, PlantumlNames.of(plain), link(Change.NEW, "reads"))
        );
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
        assertEquals(16, removed.getLineStyle(), "long dashes");
        assertEquals(3, removed.getLineGap(), "narrow gaps");
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
        assertEquals(16, style("removed", merged).getLineStyle());
        assertEquals(3, style("removed", merged).getLineGap());
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

    private Item identity(
        String id,
        Change change,
        List<String> replaces,
        List<String> replacedBy,
        String... stereotypes
    ) {
        return item(id, change, stereotypes).toBuilder().replaces(replaces).replacedBy(replacedBy).build();
    }

    @Test
    void anElementThatReplacesOthersHasItsOwnGlyphAndSaysWhereItCameFrom() {
        assertEquals(
            "rectangle a <<moved>> <<solution>> <<atomic>> [\n<U+2192> A (from shop.till)\n[solution]\n]\n",
            atomic(compared, identity("a", Change.MOVED, List.of("shop.till"), List.of(), "moved"))
        );
        assertTrue(
            atomic(compared, identity("a", Change.SPLIT, List.of("shop.report"), List.of(), "split")).contains(
                "\n<U+22D4> A (from shop.report)\n"
            )
        );
        assertTrue(
            atomic(
                compared,
                identity("a", Change.MERGED, List.of("stock.bin", "stock.shelf"), List.of(), "merged")
            ).contains("\n<U+2295> A (from stock.bin, stock.shelf)\n")
        );
        // a replaced element that is only drawn as the place of what was removed from it says what replaces it
        assertTrue(
            atomic(
                compared,
                identity("a", Change.REMOVED, List.of(), List.of("shop.report-a", "shop.report-b"), "removed")
            ).contains("\n<U+2212> --A-- (replaced by shop.report-a, shop.report-b)\n")
        );
        // a removed or a new element that replaces nothing is what it was
        assertTrue(atomic(compared, item("a", Change.REMOVED, "removed")).contains("\n<U+2212> --A--\n[solution]"));
        // and a view that compares nothing says nothing of it
        assertTrue(
            atomic(plain, identity("a", Change.MOVED, List.of("shop.till"), List.of(), "moved")).contains("\nA\n[")
        );
    }

    @Test
    void theThreeIdentityStatesAreToldApartFromTheOthersAndFromOneAnotherWithoutColour() {
        val seen = new java.util.HashSet<String>();
        for (val state : List.of("new", "changed", "removed", "contains-changes", "moved", "split", "merged")) {
            val style = ChangeMarks.style(state);
            assertTrue(
                seen.add(style.getLineStyle() + "-" + style.getLineGap() + "/" + style.getLineThickness()),
                state + " has a look of its own"
            );
            assertTrue(seen.add("glyph " + ChangeMarks.glyph(state)), state + " has a glyph of its own");
        }
        // the fill is left to the author, as for new and changed
        for (val state : List.of("moved", "split", "merged")) {
            assertEquals(null, ChangeMarks.style(state).getBackgroundColor(), state);
            assertEquals(2, ChangeMarks.style(state).getLineThickness(), state);
        }
    }

    /** What the style of a state says after {@code LineStyle:} in the view. */
    private static String lineStyleWritten(String state) {
        return PlantumlUtilities.generateStyle(ChangeMarks.style(state), state, "rectangle")
            .lines()
            .filter(line -> line.startsWith("LineStyle: "))
            .findFirst()
            .orElseThrow()
            .substring("LineStyle: ".length());
    }

    /** The dash and the gap of a state as PlantUML draws them: without a gap, the gap is as long as the dash. */
    private static int[] dashes(String state) {
        val style = ChangeMarks.style(state);
        return new int[] {
            style.getLineStyle(),
            style.getLineGap() == null ? style.getLineStyle() : style.getLineGap()
        };
    }

    @Test
    void theDashesOfRemovedSplitAndMergedDifferVisiblyFromEachOtherAndFromEveryOtherState() {
        // "visibly": the dash or the gap differs by at least 4 (units of a line 2 thick, drawn at 96 dpi), where 7, 6 and 5
        // differed by one. The pairs were rendered with plantuml-1.2024.7 and looked at (run 0057).
        val states = List.of("new", "changed", "contains-changes", "moved", "removed", "split", "merged");
        val three = List.of("removed", "split", "merged");
        assertEquals("16-3", lineStyleWritten("removed"));
        assertEquals("8", lineStyleWritten("split"), "a dash of 8 and a gap as long: 8-8");
        assertEquals("3-9", lineStyleWritten("merged"));
        for (val state : three) {
            for (val other : states) {
                if (state.equals(other) || (three.contains(other) && other.compareTo(state) < 0)) {
                    continue;
                }
                val a = dashes(state);
                val b = dashes(other);
                if (b[0] == 0) {
                    continue; // new is a solid line: it has no dash to confuse
                }
                val apart = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
                assertTrue(
                    apart >= 4,
                    state +
                        " " +
                        a[0] +
                        "-" +
                        a[1] +
                        " and " +
                        other +
                        " " +
                        b[0] +
                        "-" +
                        b[1] +
                        " are " +
                        apart +
                        " apart"
                );
            }
        }
    }

    @Test
    void aGapTravelsWithItsDashWhenTheAuthorChangesTheDash() {
        val defaults = Map.of("removed", ChangeMarks.style("removed"), "merged", ChangeMarks.style("merged"));
        val styles = Styles.builder()
            .byTag("removed", Styles.Style.builder().lineStyle(7).build())
            .byTag("merged", Styles.Style.builder().lineGap(1).build())
            .build();
        val merged = PlantumlUtilities.stereotypeStyles(styles, defaults)
            .stream()
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        // the author's `line-style: 7` is a dash of 7 and a gap of 7, not the default's gap of 3 behind another dash
        assertEquals(7, merged.get("removed").getLineStyle());
        assertEquals(null, merged.get("removed").getLineGap());
        // a gap without a dash means nothing: the default's pair stays
        assertEquals(3, merged.get("merged").getLineStyle());
        assertEquals(9, merged.get("merged").getLineGap());
        // and the line the author wrote is the line PlantUML reads
        assertTrue(
            PlantumlUtilities.generateStyle(Styles.Style.builder().lineStyle(5).build(), "rectangle", null).contains(
                "LineStyle: 5\n"
            )
        );
        assertTrue(
            PlantumlUtilities.generateStyle(
                Styles.Style.builder().lineStyle(5).lineGap(2).build(),
                "rectangle",
                null
            ).contains("LineStyle: 5-2\n")
        );
        // a solid line has no gap, and a negative gap is not one
        assertTrue(
            PlantumlUtilities.generateStyle(
                Styles.Style.builder().lineStyle(0).lineGap(3).build(),
                "rectangle",
                null
            ).contains("LineStyle: 0\n")
        );
        assertTrue(
            PlantumlUtilities.generateStyle(
                Styles.Style.builder().lineStyle(8).lineGap(-2).build(),
                "rectangle",
                null
            ).contains("LineStyle: 8\n")
        );
    }

    @Test
    void theAuthorsStyleOfAnIdentityStateWinsPropertyByPropertyAndAHandWrittenWordIsTheAuthorsOwn() {
        val defaults = Map.of("moved", ChangeMarks.style("moved"));
        val styles = Styles.builder()
            .byTag("moved", Styles.Style.builder().lineColor("black").backgroundColor("white").build())
            .build();
        val merged = PlantumlUtilities.stereotypeStyles(styles, defaults, Set.of("split"))
            .stream()
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        assertEquals("black", merged.get("moved").getLineColor());
        assertEquals("white", merged.get("moved").getBackgroundColor());
        assertEquals(12, merged.get("moved").getLineStyle(), "the dashes of the default stay");
        assertEquals(2, merged.get("moved").getLineThickness());
        // a `split` tag on a box that is not split: nothing of the default, and no style when the author has none
        assertFalse(merged.containsKey("written-split"));
        assertEquals(List.of("written-split"), ChangeMarks.stereotypes(compared, item("a", Change.MOVED, "split")));
    }

    @Test
    void theLegendListsTheStatesOfIdentityTheViewUsesAndOnlyThose() {
        val moved = identity("m", Change.MOVED, List.of("shop.till"), List.of(), "moved");
        val merged = identity("g", Change.MERGED, List.of("a", "b"), List.of(), "merged");
        Mockito.when(compared.getLinks()).thenReturn(Set.of());
        Mockito.when(compared.getItems()).thenReturn(Set.of(item("n", Change.NEW, "new")));
        val without = ChangeMarks.legend(compared);
        assertFalse(
            without.contains("<U+2192>") || without.contains("<U+22D4>") || without.contains("<U+2295>"),
            without
        );
        Mockito.when(compared.getItems()).thenReturn(Set.of(moved, merged));
        val legend = ChangeMarks.legend(compared);
        assertTrue(
            legend.contains("| **<U+2192>** | moved or renamed, replaces one element: long dashes, wide gaps | |"),
            legend
        );
        assertTrue(
            legend.contains("| **<U+2295>** | merged, replaces several elements: short dashes, far apart | |"),
            legend
        );
        assertFalse(legend.contains("split"), legend);
        assertEquals(List.of("merged", "moved"), List.copyOf(ChangeMarks.styles(compared).keySet()));
    }
}

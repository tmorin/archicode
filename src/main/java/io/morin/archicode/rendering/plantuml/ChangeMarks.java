package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * How the views of a comparison of two plateaus tell what changed, in PlantUML. Never by colour alone: a glyph in the label
 * of the box or of the link, a line style, and for a removed box a struck title and a grey one.
 *
 * <table>
 *   <caption>The states</caption>
 *   <tr><th>State</th><th>Glyph</th><th>Box</th><th>Link</th></tr>
 *   <tr><td>{@code new}</td><td>+</td><td>thick solid outline</td><td>thick solid line</td></tr>
 *   <tr><td>{@code changed}</td><td>~</td><td>dotted outline</td><td>dotted line</td></tr>
 *   <tr><td>{@code removed}</td><td>&minus;</td><td>long dashes with narrow gaps (16-3), grey outline, grey struck title</td><td>dashed grey line</td></tr>
 *   <tr><td>{@code contains-changes}</td><td>&plusmn;</td><td>thin dashed outline</td><td>-</td></tr>
 *   <tr><td>{@code moved}</td><td>&rarr;</td><td>long dashes with wide gaps (12-12), blue, "(from ...)" after the title</td><td>-</td></tr>
 *   <tr><td>{@code split}</td><td>&#x22D4;</td><td>medium dashes (8-8), purple, "(from ...)" after the title</td><td>-</td></tr>
 *   <tr><td>{@code merged}</td><td>&oplus;</td><td>short dashes far apart (3-9), light blue, "(from ..., ...)" after the title</td><td>-</td></tr>
 * </table>
 *
 * The three last ones say that an element is the same thing as one of the plateau before ({@code replaces}): the title tells
 * what it replaces. A removed box that is only there to hold what was removed from it, because the element was replaced,
 * says what replaces it: "(replaced by ...)".
 *
 * The three states that are dashes and nothing else (removed, split and merged) have a dash and a gap that differ
 * pairwise, and differ from the line of {@code changed} (2-2), of {@code contains-changes} (4-4) and of {@code moved}
 * (12-12): {@code LineStyle: 16-3}, {@code 8-8} and {@code 3-9} (run 0057, issue 55). They used to be 7, 6 and 5, which
 * differ by one pixel (and the 6 of split is now 8, to sit between the 4 of contains-changes and the 12 of moved).
 *
 * <p>The glyphs are written as PlantUML escapes ({@code <U+2212>}), so that a file is plain ASCII whatever the encoding of
 * the machine, and {@code ~}, which Creole takes for an escape, is a character like another. What PlantUML 1.2024.7 draws
 * for them was looked at on a file written by hand (see run 0038 and run 0044).
 *
 * <p>The look of a box is the style of its stereotype, the stereotype that the kernel put last in the stereotypes of the
 * item. The styles below are the default: the author's {@code styles.by-tags} (or {@code by-qualifiers}) entry of the
 * same name wins, property by property.
 *
 * <p>The default look belongs to the box that has the state <em>computed</em>, and to no other (the rule of the editor,
 * wave 009 D-5). A stereotype that is the name of a state but is not the state of its box (a tag written by hand on an
 * element that did not change, or that changed otherwise) is written as {@code written-<name>} in the box, and that
 * stereotype has the author's own style of the name and nothing of the default.
 */
@UtilityClass
class ChangeMarks {

    static final String NEW = "new";
    static final String CHANGED = "changed";
    static final String REMOVED = "removed";

    /** What the kernel adds to an element that did not change and has something that did below it. */
    static final String CONTAINS_CHANGES = "contains-changes";

    static final String MOVED = "moved";
    static final String SPLIT = "split";
    static final String MERGED = "merged";

    /** Every word that is a state of a comparison. */
    static final Set<String> STATES = Set.of(NEW, CHANGED, REMOVED, CONTAINS_CHANGES, MOVED, SPLIT, MERGED);

    /** What is put before the name of a state that the author wrote and the box does not have. */
    static final String WRITTEN = "written-";

    private static final String GLYPH_NEW = "+";
    private static final String GLYPH_CHANGED = "<U+007E>";
    private static final String GLYPH_REMOVED = "<U+2212>";
    private static final String GLYPH_CONTAINS = "<U+00B1>";
    private static final String GLYPH_MOVED = "<U+2192>";
    private static final String GLYPH_SPLIT = "<U+22D4>";
    private static final String GLYPH_MERGED = "<U+2295>";

    private static final String GREY = "#7F7F7F";

    /** The state a box says, or empty for a box that did not change and holds nothing that did. */
    Optional<String> stateOf(@NonNull Viewpoint viewpoint, @NonNull Item item) {
        if (!viewpoint.isCompared()) {
            return Optional.empty();
        }
        return switch (item.getChange()) {
            case NEW -> Optional.of(NEW);
            case CHANGED -> Optional.of(CHANGED);
            case REMOVED -> Optional.of(REMOVED);
            case MOVED, SPLIT, MERGED -> Optional.of(item.getChange().word());
            case NONE -> item.getStereotypes().isEmpty() || !item.getStereotypes().getLast().equals(CONTAINS_CHANGES)
                ? Optional.empty()
                : Optional.of(CONTAINS_CHANGES);
        };
    }

    /**
     * The stereotypes of a box, as they are written in the view. In a comparison, a stereotype that is the name of a state
     * but not the state of the box keeps its place and is written {@code written-<name>}: the default look of the state
     * is the style of {@code <name>}, and it is for the box that has the state. Without a comparison, nothing changes.
     */
    List<String> stereotypes(@NonNull Viewpoint viewpoint, @NonNull Item item) {
        val computed = stateOf(viewpoint, item);
        val out = new ArrayList<String>(item.getStereotypes().size());
        for (val stereotype : item.getStereotypes()) {
            out.add(isWritten(viewpoint, stereotype, computed) ? WRITTEN + stereotype : stereotype);
        }
        return out;
    }

    private boolean isWritten(Viewpoint viewpoint, String stereotype, Optional<String> computed) {
        return viewpoint.isCompared() && STATES.contains(stereotype) && !computed.equals(Optional.of(stereotype));
    }

    /** The names of the states that the author wrote on a box of the view that does not have them, sorted. */
    Set<String> writtenStates(@NonNull Viewpoint viewpoint) {
        val used = new TreeSet<String>();
        if (viewpoint.isCompared()) {
            viewpoint.getItems().forEach(root ->
                root.stream().forEach(item -> {
                    val computed = stateOf(viewpoint, item);
                    item.getStereotypes()
                        .stream()
                        .filter(stereotype -> isWritten(viewpoint, stereotype, computed))
                        .forEach(used::add);
                })
            );
        }
        return used;
    }

    /** The state a link says, or empty for a link that did not change. */
    Optional<String> stateOf(@NonNull Viewpoint viewpoint, @NonNull Link link) {
        if (!viewpoint.isCompared()) {
            return Optional.empty();
        }
        return switch (link.getChange()) {
            case NEW -> Optional.of(NEW);
            case CHANGED -> Optional.of(CHANGED);
            case REMOVED -> Optional.of(REMOVED);
            case NONE, MOVED, SPLIT, MERGED -> Optional.empty();
        };
    }

    /** The glyph of a state, as PlantUML reads it. */
    String glyph(@NonNull String state) {
        return switch (state) {
            case NEW -> GLYPH_NEW;
            case CHANGED -> GLYPH_CHANGED;
            case REMOVED -> GLYPH_REMOVED;
            case MOVED -> GLYPH_MOVED;
            case SPLIT -> GLYPH_SPLIT;
            case MERGED -> GLYPH_MERGED;
            default -> GLYPH_CONTAINS;
        };
    }

    /**
     * The title of a box: the glyph, then the name; a removed box has its name struck.
     *
     * @param state the state of the box, or empty
     * @param name  the name
     */
    String title(@NonNull Optional<String> state, @NonNull String name) {
        if (state.isEmpty()) {
            return name;
        }
        return glyph(state.get()) + " " + (state.get().equals(REMOVED) ? "--" + name + "--" : name);
    }

    /**
     * The title of a box, with where the element comes from when it replaces others ("(from shop.till)"), or what
     * replaces it when the box is only the place of what was removed from it ("(replaced by shop.report-a)").
     *
     * @param state the state of the box, or empty
     * @param name  the name
     * @param item  the box
     */
    String title(@NonNull Optional<String> state, @NonNull String name, @NonNull Item item) {
        val title = title(state, name);
        if (state.isEmpty()) {
            return title;
        }
        if (!item.getReplaces().isEmpty()) {
            return title + " (from " + String.join(", ", item.getReplaces()) + ")";
        }
        if (!item.getReplacedBy().isEmpty()) {
            return title + " (replaced by " + String.join(", ", item.getReplacedBy()) + ")";
        }
        return title;
    }

    /** The arrow of a link; a link that did not change keeps the one it always had. */
    String arrow(@NonNull Optional<String> state) {
        return state
            .map(
                s ->
                    switch (s) {
                        case NEW -> "-[thickness=3,#009E73]->";
                        case CHANGED -> "-[dotted,thickness=2,#E69F00]->";
                        default -> "-[dashed," + GREY + "]->";
                    }
            )
            .orElse("-->");
    }

    /** The label of a link: the glyph in bold, then what the label already said. */
    String label(@NonNull Optional<String> state, @NonNull String label) {
        if (state.isEmpty()) {
            return label;
        }
        val glyph = "**" + glyph(state.get()) + "**";
        return label.isBlank() ? glyph : glyph + " " + label;
    }

    /**
     * The default style of a state. The fill of the author is left alone (a new or a changed box keeps its own colours,
     * the outline says it); a removed box is grey, with a grey title.
     */
    Styles.Style style(@NonNull String state) {
        return switch (state) {
            case NEW -> Styles.Style.builder().lineColor("#009E73").lineStyle(0).lineThickness(3).build();
            case CHANGED -> Styles.Style.builder().lineColor("#E69F00").lineStyle(2).lineThickness(2).build();
            case REMOVED -> Styles.Style.builder()
                .backgroundColor("#EEEEEE")
                .lineColor(GREY)
                .lineStyle(16)
                .lineGap(3)
                .lineThickness(2)
                .fontColor(GREY)
                .build();
            // an element that is the same thing as one of the plateau before: a blue, a purple or a light blue outline of dashes
            // of its own (moved 12-12, split 8-8, merged 3-9), medium thick, the fill left to the author (the glyph and the
            // title say which of the three it is)
            case MOVED -> Styles.Style.builder().lineColor("#0072B2").lineStyle(12).lineThickness(2).build();
            case SPLIT -> Styles.Style.builder().lineColor("#CC79A7").lineStyle(8).lineThickness(2).build();
            case MERGED -> Styles.Style.builder().lineColor("#56B4E9").lineStyle(3).lineGap(9).lineThickness(2).build();
            default -> Styles.Style.builder().lineColor("#5B7C99").lineStyle(4).lineThickness(1).build();
        };
    }

    /** The default styles of the states a view uses, by name. */
    Map<String, Styles.Style> styles(@NonNull Viewpoint viewpoint) {
        val used = new TreeSet<String>();
        viewpoint
            .getItems()
            .forEach(root -> root.stream().forEach(item -> stateOf(viewpoint, item).ifPresent(used::add)));
        viewpoint.getLinks().forEach(link -> stateOf(viewpoint, link).ifPresent(used::add));
        val styles = new LinkedHashMap<String, Styles.Style>();
        used.forEach(state -> styles.put(state, style(state)));
        return styles;
    }

    private static String nameOf(Settings.Plateau plateau) {
        return plateau.getName() == null || plateau.getName().isBlank() ? plateau.getId() : plateau.getName();
    }

    /**
     * The legend of a view of a comparison: what the glyphs and the lines mean. It is there when the view says at least
     * one change; it lists the four states, so that a reader learns the language, and the states of identity (moved, split,
     * merged) that the view uses, so that the legend of a view that has none is what it always was.
     */
    String legend(@NonNull Viewpoint viewpoint) {
        val used = styles(viewpoint);
        if (used.isEmpty()) {
            return "";
        }
        val buf = new StringBuilder();
        val nl = System.lineSeparator();
        buf.append("legend right").append(nl);
        val plateau = viewpoint.getWorkspace().getPlateau();
        val baseline = viewpoint.getWorkspace().getBaseline();
        if (plateau != null && baseline != null) {
            buf.append("**")
                .append(nameOf(plateau))
                .append("** compared with **")
                .append(nameOf(baseline))
                .append("**")
                .append(nl);
        }
        buf.append("|= Mark |= Box |= Link |").append(nl);
        buf.append("| **")
            .append(GLYPH_NEW)
            .append("** | new: thick solid outline | new: thick solid line |")
            .append(nl);
        buf.append("| **")
            .append(GLYPH_CHANGED)
            .append("** | changed: dotted outline | changed: dotted line |")
            .append(nl);
        buf.append("| **")
            .append(GLYPH_REMOVED)
            .append("** | removed: long dashes, narrow gaps, grey outline, struck title | removed: dashed grey line |")
            .append(nl);
        buf.append("| **")
            .append(GLYPH_CONTAINS)
            .append("** | something inside changed: thin dashed outline | |")
            .append(nl);
        if (used.containsKey(MOVED)) {
            buf.append("| **")
                .append(GLYPH_MOVED)
                .append("** | moved or renamed, replaces one element: long dashes, wide gaps | |")
                .append(nl);
        }
        if (used.containsKey(SPLIT)) {
            buf.append("| **")
                .append(GLYPH_SPLIT)
                .append("** | split, one of several that replace one element: medium dashes | |")
                .append(nl);
        }
        if (used.containsKey(MERGED)) {
            buf.append("| **")
                .append(GLYPH_MERGED)
                .append("** | merged, replaces several elements: short dashes, far apart | |")
                .append(nl);
        }
        buf.append("endlegend").append(nl);
        return buf.toString();
    }
}

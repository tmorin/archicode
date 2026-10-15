package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * How the views of a comparison of two plateaus tell what changed, in PlantUML. Never by colour alone: a glyph in the label
 * of the box or of the link, a line style, and for a removed box a struck title and a grey one.
 *
 * <table>
 *   <caption>The four states</caption>
 *   <tr><th>State</th><th>Glyph</th><th>Box</th><th>Link</th></tr>
 *   <tr><td>{@code new}</td><td>+</td><td>thick solid outline</td><td>thick solid line</td></tr>
 *   <tr><td>{@code changed}</td><td>~</td><td>dotted outline</td><td>dotted line</td></tr>
 *   <tr><td>{@code removed}</td><td>&minus;</td><td>dashed grey outline, grey struck title</td><td>dashed grey line</td></tr>
 *   <tr><td>{@code contains-changes}</td><td>&plusmn;</td><td>thin dashed outline</td><td>-</td></tr>
 * </table>
 *
 * The glyphs are written as PlantUML escapes ({@code <U+2212>}), so that a file is plain ASCII whatever the encoding of
 * the machine, and {@code ~}, which Creole takes for an escape, is a character like another. What PlantUML 1.2024.7 draws
 * for them was looked at on a file written by hand (see run 0038).
 *
 * <p>The look of a box is the style of its stereotype, the stereotype that the kernel put last in the stereotypes of the
 * item. The styles below are the default: the author's {@code styles.by-tags} (or {@code by-qualifiers}) entry of the
 * same name wins, property by property.
 */
@UtilityClass
class ChangeMarks {

    static final String NEW = "new";
    static final String CHANGED = "changed";
    static final String REMOVED = "removed";

    /** What the kernel adds to an element that did not change and has something that did below it. */
    static final String CONTAINS_CHANGES = "contains-changes";

    private static final String GLYPH_NEW = "+";
    private static final String GLYPH_CHANGED = "<U+007E>";
    private static final String GLYPH_REMOVED = "<U+2212>";
    private static final String GLYPH_CONTAINS = "<U+00B1>";

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
            case NONE -> item.getStereotypes().isEmpty() || !item.getStereotypes().getLast().equals(CONTAINS_CHANGES)
                ? Optional.empty()
                : Optional.of(CONTAINS_CHANGES);
        };
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
            case NONE -> Optional.empty();
        };
    }

    /** The glyph of a state, as PlantUML reads it. */
    String glyph(@NonNull String state) {
        return switch (state) {
            case NEW -> GLYPH_NEW;
            case CHANGED -> GLYPH_CHANGED;
            case REMOVED -> GLYPH_REMOVED;
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
                .lineStyle(7)
                .lineThickness(2)
                .fontColor(GREY)
                .build();
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
     * one change; it lists the four states, so that a reader learns the language.
     */
    String legend(@NonNull Viewpoint viewpoint) {
        if (styles(viewpoint).isEmpty()) {
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
            .append("** | removed: dashed grey outline, struck title | removed: dashed grey line |")
            .append(nl);
        buf.append("| **")
            .append(GLYPH_CONTAINS)
            .append("** | something inside changed: thin dashed outline | |")
            .append(nl);
        buf.append("endlegend").append(nl);
        return buf.toString();
    }
}

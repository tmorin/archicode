package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.Optional;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * How a Map view draws the links it is told to highlight (wave 026, run 0198, issue #143, DEC-5). A view is highlighting when
 * one of its links is. A highlighted link is the heaviest line of the view (thickness 5), with the glyph {@code U+25B6} and a
 * bold label, so colour is never alone; it keeps the colour, the dash and the glyph of its state. A link that is not
 * highlighted, in a highlighting view and with no state, is drawn calm: light grey, with a grey label.
 */
@UtilityClass
class HighlightMarks {

    private static final String GLYPH = "**<U+25B6>**";
    private static final String COLOUR = "#D55E00";
    private static final String GREY = "#7F7F7F";
    private static final String CALM = "#A6A6A6";

    /** Whether at least one of the links of the view is highlighted. */
    boolean isHighlighting(@NonNull Viewpoint viewpoint) {
        return viewpoint.getLinks().stream().anyMatch(Link::isHighlighted);
    }

    /** The arrow of a highlighted link: the line of its state, at the weight of the highlight. */
    String arrow(@NonNull Optional<String> state) {
        val s = state.orElse("");
        return switch (s) {
            case ChangeMarks.NEW -> "-[thickness=5,#009E73]->";
            case ChangeMarks.CHANGED -> "-[dotted,thickness=5,#E69F00]->";
            case ChangeMarks.REMOVED -> "-[dashed,thickness=5," + GREY + "]->";
            default -> "-[thickness=5," + COLOUR + "]->";
        };
    }

    /** The arrow of a link that is not highlighted in a highlighting view and says no state. */
    String calmArrow() {
        return "-[" + CALM + "]->";
    }

    /** The label of a calm link. */
    String calmLabel(@NonNull String label) {
        return "<color:" + GREY + ">" + label + "</color>";
    }

    /**
     * The description of a highlighted link: the glyph of its state if any, the glyph of the highlight, the label in bold,
     * then the qualifiers.
     *
     * @param label      the label already formatted, or empty
     * @param qualifiers the qualifiers already formatted, or empty
     */
    String description(@NonNull Optional<String> state, @NonNull String label, @NonNull String qualifiers) {
        val buf = new StringBuilder();
        state.ifPresent(s -> buf.append("**").append(ChangeMarks.glyph(s)).append("** "));
        buf.append(GLYPH);
        if (!label.isBlank()) {
            buf.append(" **").append(label).append("**");
        }
        if (!qualifiers.isBlank()) {
            buf.append("\\n").append(qualifiers);
        }
        return buf.toString();
    }
}

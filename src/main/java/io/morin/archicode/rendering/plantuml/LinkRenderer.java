package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.ArrayList;
import java.util.Optional;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
class LinkRenderer {

    String render(@NonNull Viewpoint viewpoint, @NonNull PlantumlNames names, @NonNull Link link) {
        log.debug("render link {}", link);

        val buf = new StringBuilder();

        val linkFormatter = viewpoint.getWorkspace().getFormatters().getLink();

        // what changed between two plateaus, when the view compares them
        val state = ChangeMarks.stateOf(viewpoint, link);

        val secondary = link.getTags().containsKey("rendering-secondary");
        val highlighting = !secondary && HighlightMarks.isHighlighting(viewpoint);
        val heavy = highlighting && link.isHighlighted();
        val calm = highlighting && !heavy && state.isEmpty();

        buf.append(names.of(link.getFrom()));
        buf.append(" ");
        if (secondary) {
            buf.append("..[#gray]>");
        } else if (heavy) {
            buf.append(HighlightMarks.arrow(state));
        } else if (calm) {
            buf.append(HighlightMarks.calmArrow());
        } else {
            buf.append(ChangeMarks.arrow(state));
        }
        buf.append(" ");
        buf.append(names.of(link.getTo()));

        val descriptionAsList = new ArrayList<String>();

        val label = Optional.ofNullable(link.getLabel())
            .filter(v -> !v.isBlank())
            .map(v -> String.format(linkFormatter.getLabel(), v))
            .orElse("");
        val qualifiers = Optional.of(PlantumlUtilities.generateQualifiers(link))
            .filter(v -> !v.isBlank())
            .map(v -> String.format(linkFormatter.getQualifiers(), v))
            .orElse("");

        if (heavy) {
            buf.append(" : ").append(HighlightMarks.description(state, label, qualifiers));
            buf.append(System.lineSeparator());
            return buf.toString();
        }

        if (!label.isEmpty()) {
            descriptionAsList.add(calm ? HighlightMarks.calmLabel(label) : label);
        }
        if (!qualifiers.isEmpty()) {
            descriptionAsList.add(qualifiers);
        }

        Optional.of(ChangeMarks.label(state, String.join("\\n", descriptionAsList)))
            .filter(v -> !v.isBlank())
            .ifPresent(description -> {
                buf.append(" : ");
                buf.append(description);
            });

        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

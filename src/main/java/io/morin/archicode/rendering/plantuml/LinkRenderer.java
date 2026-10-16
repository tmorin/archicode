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

        buf.append(names.of(link.getFrom()));
        buf.append(" ");
        if (link.getTags().containsKey("rendering-secondary")) {
            buf.append("..[#gray]>");
        } else {
            buf.append(ChangeMarks.arrow(state));
        }
        buf.append(" ");
        buf.append(names.of(link.getTo()));

        val descriptionAsList = new ArrayList<String>();

        Optional.ofNullable(link.getLabel())
            .filter(v -> !v.isBlank())
            .map(v -> String.format(linkFormatter.getLabel(), v))
            .ifPresent(descriptionAsList::add);

        Optional.of(PlantumlUtilities.generateQualifiers(link))
            .filter(v -> !v.isBlank())
            .map(v -> String.format(linkFormatter.getQualifiers(), v))
            .ifPresent(descriptionAsList::add);

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

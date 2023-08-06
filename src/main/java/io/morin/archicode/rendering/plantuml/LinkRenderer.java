package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.viewpoint.Link;
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

    String render(@NonNull Link link) {
        val buf = new StringBuilder();

        buf.append(link.getFrom().getItemId());
        buf.append(" --> ");
        buf.append(link.getTo().getItemId());

        val descriptionAsList = new ArrayList<String>();

        Optional
            .ofNullable(link.getLabel())
            .filter(v -> !v.isBlank())
            .map(label -> String.format("**%s**", label))
            .ifPresent(descriptionAsList::add);

        Optional
            .of(PlantumlUtilities.generateQualifiers(link))
            .filter(v -> !v.isBlank())
            .ifPresent(descriptionAsList::add);

        Optional
            .of(String.join("\\n", descriptionAsList))
            .filter(v -> !v.isBlank())
            .ifPresent(description -> {
                buf.append(" : ");
                buf.append(description);
            });

        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

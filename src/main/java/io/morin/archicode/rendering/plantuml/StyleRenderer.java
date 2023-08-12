package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.viewpoint.Viewpoint;

import java.util.Optional;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
class StyleRenderer {

    String render(@NonNull Viewpoint viewpoint) {
        val buf = new StringBuilder();

        buf.append(PlantumlUtilities.generateSkinparam("defaultTextAlignment", "center"));
        buf.append(System.lineSeparator());

        buf.append(PlantumlUtilities.generateSkinparam("defaultTextAlignment<<atomic>>", "center"));
        buf.append(System.lineSeparator());

        buf.append(PlantumlUtilities.generateSkinparam("wrapWidth", "200"));
        buf.append(System.lineSeparator());

        buf.append(PlantumlUtilities.generateSkinparam("maxMessageSize", "150"));
        buf.append(System.lineSeparator());

        buf.append("hide stereotype");
        buf.append(System.lineSeparator());

        buf.append("<style>");
        buf.append(System.lineSeparator());

        Optional
            .ofNullable(viewpoint.getWorkspace().getStyles().getAtomic())
            .ifPresent(style -> buf.append(PlantumlUtilities.generateStyle(style, "atomic", null)));
        Optional
            .ofNullable(viewpoint.getWorkspace().getStyles().getComposite())
            .ifPresent(style -> buf.append(PlantumlUtilities.generateStyle(style, "composite", null)));

        buf.append("</style>");
        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

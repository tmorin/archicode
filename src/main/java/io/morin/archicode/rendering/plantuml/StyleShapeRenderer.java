package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.resource.workspace.Styles;
import java.util.Map;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
class StyleShapeRenderer {

    String render(@NonNull String shape, @NonNull Map.Entry<String, Styles.Style> entry) {
        val buf = new StringBuilder();

        val stereotype = entry.getKey();
        val style = entry.getValue();

        if (style.isShadowing()) {
            buf.append(String.format("skinparam %sShadowing<<%s>> true", shape, stereotype));
            buf.append(System.lineSeparator());
        }

        buf.append("<style>");
        buf.append(System.lineSeparator());

        buf.append(PlantumlUtilities.generateStyle(style, stereotype, shape));

        buf.append("</style>");
        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

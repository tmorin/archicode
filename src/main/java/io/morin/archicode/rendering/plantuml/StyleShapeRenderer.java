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

        buf.append(String.format("skinparam %s<<%s>> {", shape, stereotype));
        buf.append(System.lineSeparator());

        if (style.getBackgroundColor() != null && !style.getBackgroundColor().isBlank()) {
            buf.append(String.format("BackgroundColor %s", style.getBackgroundColor()));
            buf.append(System.lineSeparator());
        }

        if (style.getBorderColor() != null && !style.getBorderColor().isBlank()) {
            buf.append(String.format("BorderColor %s", style.getBorderColor()));
            buf.append(System.lineSeparator());
        }

        if (style.getBorderStyle() != null && !style.getBorderStyle().isBlank()) {
            buf.append(String.format("BorderStyle %s", style.getBorderStyle()));
            buf.append(System.lineSeparator());
        }

        if (style.getRoundCorner() > 0) {
            buf.append(String.format("RoundCorner %s", style.getRoundCorner()));
            buf.append(System.lineSeparator());
        }

        if (style.getForegroundColor() != null && !style.getForegroundColor().isBlank()) {
            buf.append(String.format("FontColor %s", style.getForegroundColor()));
            buf.append(System.lineSeparator());
        }

        if (style.isShadowing()) {
            buf.append("shadowing true");
            buf.append(System.lineSeparator());
        }

        buf.append("}");
        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

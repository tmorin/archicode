package io.morin.archicode.rendering.plantuml;

import static io.morin.archicode.rendering.plantuml.PlantumlUtilities.generateSkinparam;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
class StyleRenderer {

    String render() {
        val buf = new StringBuilder();

        buf.append(generateSkinparam("defaultTextAlignment", "center"));
        buf.append(System.lineSeparator());

        buf.append(generateSkinparam("wrapWidth", "200"));
        buf.append(System.lineSeparator());

        buf.append(generateSkinparam("maxMessageSize", "150"));
        buf.append(System.lineSeparator());

        buf.append("hide stereotype");
        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

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
class TitleRenderer {

    String render(@NonNull Viewpoint viewpoint) {
        val buf = new StringBuilder();

        Optional.ofNullable(viewpoint.getView().getDescription())
            .filter(v -> !v.isBlank())
            .ifPresent(description -> {
                buf.append(String.format("title %s", viewpoint.getView().getDescription()));
                buf.append(System.lineSeparator());
            });

        return buf.toString();
    }
}

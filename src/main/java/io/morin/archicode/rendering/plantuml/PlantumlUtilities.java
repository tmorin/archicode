package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;

@UtilityClass
class PlantumlUtilities {

    String generateSkinparam(@NonNull String key, @NonNull String value) {
        return String.format("skinparam %s %s", key, value);
    }

    String generateStereotypes(@NonNull Item item, @NonNull String... types) {
        val stereotypes = new LinkedHashSet<>(item.getElement().getQualifiers());
        stereotypes.addAll(List.of(types));
        return String.join(
            " ",
            stereotypes.stream().map(value -> String.format("<<%s>>", value)).collect(Collectors.toSet())
        );
    }

    String generateQualifiers(@NonNull Item item) {
        val buf = new StringBuilder();
        buf.append("[");
        buf.append(item.getKind().name().toLowerCase());

        Optional
            .ofNullable(item.getElement().getQualifiers())
            .map(qualifiers -> String.join(", ", qualifiers))
            .filter(v -> !v.isBlank())
            .ifPresent(technology -> {
                buf.append(": ");
                buf.append(technology);
            });

        buf.append("]");
        return buf.toString();
    }

    String generateQualifiers(@NonNull Link link) {
        val buf = new StringBuilder();
        Optional
            .of(link.getQualifiers())
            .map(qualifiers -> String.join(", ", qualifiers))
            .filter(v -> !v.isBlank())
            .ifPresent(str -> {
                buf.append("[");
                buf.append(str);
                buf.append("]");
            });
        return buf.toString();
    }
}

package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.ViewRenderer;
import io.morin.archicode.resource.workspace.Styles;
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

    String generateStyle(@NonNull Styles.Style style, @NonNull String stereotype, String shape) {
        val buf = new StringBuilder();

        buf.append(String.format(".%s {", stereotype));
        buf.append(System.lineSeparator());

        Optional
            .ofNullable(shape)
            .ifPresent(v -> {
                buf.append(String.format("%s {", v));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getBackgroundColor())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("BackgroundColor: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getLineColor())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("LineColor: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getLineStyle())
            .ifPresent(s -> {
                buf.append(String.format("LineStyle: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getLineThickness())
            .ifPresent(s -> {
                buf.append(String.format("LineThickness: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getRoundCorner())
            .ifPresent(s -> {
                buf.append(String.format("RoundCorner: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getFontColor())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("FontColor: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(style.getFontStyle())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("FontStyle: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional
            .ofNullable(shape)
            .ifPresent(s -> {
                buf.append("}");
                buf.append(System.lineSeparator());
            });

        buf.append("}");
        buf.append(System.lineSeparator());

        return buf.toString();
    }

    String generateStereotypes(@NonNull Item item, @NonNull String... types) {
        val stereotypes = new LinkedHashSet<>(item.getElement().getQualifiers());
        Optional
            .ofNullable(item.getElement().getTags().get(ViewRenderer.TAG_ADDITIONAL_STEREOTYPES))
            .ifPresent(stereotypes::add);
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
            .ifPresent(qualifiers -> {
                buf.append(": ");
                buf.append(qualifiers);
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
            .ifPresent(qualifiers -> {
                buf.append("[");
                buf.append(qualifiers);
                buf.append("]");
            });
        return buf.toString();
    }
}

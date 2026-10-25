package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
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

        Optional.ofNullable(shape).ifPresent(v -> {
            buf.append(String.format("%s {", v));
            buf.append(System.lineSeparator());
        });

        Optional.ofNullable(style.getBackgroundColor())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("BackgroundColor: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional.ofNullable(style.getLineColor())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("LineColor: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional.ofNullable(style.getLineStyle()).ifPresent(s -> {
            // the gap goes with a dash: a solid line (0) has none, and a gap below 0 is not one
            val gap = style.getLineGap();
            buf.append(String.format("LineStyle: %s", gap == null || s <= 0 || gap < 0 ? s : s + "-" + gap));
            buf.append(System.lineSeparator());
        });

        Optional.ofNullable(style.getLineThickness()).ifPresent(s -> {
            buf.append(String.format("LineThickness: %s", s));
            buf.append(System.lineSeparator());
        });

        Optional.ofNullable(style.getRoundCorner()).ifPresent(s -> {
            buf.append(String.format("RoundCorner: %s", s));
            buf.append(System.lineSeparator());
        });

        Optional.ofNullable(style.getFontColor())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("FontColor: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional.ofNullable(style.getFontStyle())
            .filter(v -> !v.isBlank())
            .ifPresent(s -> {
                buf.append(String.format("FontStyle: %s", s));
                buf.append(System.lineSeparator());
            });

        Optional.ofNullable(shape).ifPresent(s -> {
            buf.append("}");
            buf.append(System.lineSeparator());
        });

        buf.append("}");
        buf.append(System.lineSeparator());

        return buf.toString();
    }

    /**
     * The styles of the stereotypes, one per stereotype, in a stable order (by name).
     *
     * <p>A stereotype named in both maps is one style: {@code by-tags} overrides {@code by-qualifiers} property by
     * property, as the editor does. The order has no bearing on the look of a box (PlantUML resolves it from the order
     * of the stereotypes of the box, see {@link #generateStereotypes}), it only keeps the output identical from one run
     * to the next.
     */
    List<Map.Entry<String, Styles.Style>> stereotypeStyles(@NonNull Styles styles) {
        return stereotypeStyles(styles, Map.of());
    }

    /**
     * The styles of the stereotypes, with the default styles of the states of a comparison under the author's.
     *
     * <p>A default style is the base of the style of its name: the author's {@code by-qualifiers} entry of the same name
     * is laid over it, then the {@code by-tags} entry, property by property, so that an author who styles {@code removed}
     * with a red outline keeps the dashes and the grey title of the default.
     *
     * @param styles   the styles of the workspace
     * @param defaults the default styles, by stereotype (empty for a view that compares nothing)
     */
    List<Map.Entry<String, Styles.Style>> stereotypeStyles(
        @NonNull Styles styles,
        @NonNull Map<String, Styles.Style> defaults
    ) {
        return stereotypeStyles(styles, defaults, Set.of());
    }

    /**
     * The styles of the stereotypes, with the default styles of the states of a comparison under the author's, and the
     * author's own style for the states they wrote on a box that does not have them.
     *
     * <p>A state written by hand on a box that does not have it is the stereotype {@code written-<name>} (see
     * {@link ChangeMarks#stereotypes}): its style is the one the author gave to {@code <name>}, without the default look
     * of the state, which is for the boxes that have the state computed.
     *
     * @param styles   the styles of the workspace
     * @param defaults the default styles, by stereotype (empty for a view that compares nothing)
     * @param written  the states the view has written by hand on a box that does not have them
     */
    List<Map.Entry<String, Styles.Style>> stereotypeStyles(
        @NonNull Styles styles,
        @NonNull Map<String, Styles.Style> defaults,
        @NonNull Set<String> written
    ) {
        val merged = new TreeMap<String, Styles.Style>(defaults);
        styles
            .getByQualifiers()
            .forEach((stereotype, style) -> merged.merge(stereotype, style, PlantumlUtilities::override));
        styles.getByTags().forEach((stereotype, style) -> merged.merge(stereotype, style, PlantumlUtilities::override));
        for (val state : written) {
            val own = new TreeMap<String, Styles.Style>();
            Optional.ofNullable(styles.getByQualifiers().get(state)).ifPresent(style -> own.put(state, style));
            Optional.ofNullable(styles.getByTags().get(state)).ifPresent(style ->
                own.merge(state, style, PlantumlUtilities::override)
            );
            if (own.containsKey(state)) {
                merged.put(ChangeMarks.WRITTEN + state, own.get(state));
            }
        }
        return List.copyOf(merged.entrySet());
    }

    /** The properties {@code top} sets, over the ones {@code base} sets. */
    private Styles.Style override(@NonNull Styles.Style base, @NonNull Styles.Style top) {
        return Styles.Style.builder()
            .backgroundColor(pick(top.getBackgroundColor(), base.getBackgroundColor()))
            .lineColor(pick(top.getLineColor(), base.getLineColor()))
            // a dash and its gap are one property: the gap of the base is not the gap of the dash the top style chose
            .lineStyle(Optional.ofNullable(top.getLineStyle()).orElse(base.getLineStyle()))
            .lineGap(top.getLineStyle() == null ? base.getLineGap() : top.getLineGap())
            .lineThickness(Optional.ofNullable(top.getLineThickness()).orElse(base.getLineThickness()))
            .roundCorner(Optional.ofNullable(top.getRoundCorner()).orElse(base.getRoundCorner()))
            .fontColor(pick(top.getFontColor(), base.getFontColor()))
            .fontStyle(pick(top.getFontStyle(), base.getFontStyle()))
            // `false` is the same as unset here, so a style cannot switch off the shadow another one switched on
            .shadowing(top.isShadowing() || base.isShadowing())
            .build();
    }

    private String pick(String top, String base) {
        return top == null || top.isBlank() ? base : top;
    }

    /**
     * The stereotypes of the element, then the ones of the way it is drawn.
     *
     * <p>PlantUML merges the styles of the stereotypes of a box property by property and the <em>first</em> stereotype
     * of the box wins, whatever the order of the style blocks. The editor's rule is that the <em>later</em> stereotype
     * of the box wins (the kernel tells them in the order the rule needs: qualifiers, then the words of the tag), so the
     * stereotypes of the element are written in reverse. The ones of the way it is drawn stay last, the weakest.
     */
    String generateStereotypes(@NonNull Item item, @NonNull String... types) {
        return generateStereotypes(item.getStereotypes(), types);
    }

    /** The same, for the stereotypes of an element as a view writes them (see {@link ChangeMarks#stereotypes}). */
    String generateStereotypes(@NonNull List<String> elementStereotypes, @NonNull String... types) {
        val stereotypes = new LinkedHashSet<>(elementStereotypes.reversed());
        stereotypes.addAll(List.of(types));
        return stereotypes
            .stream()
            .map(value -> String.format("<<%s>>", value))
            .collect(Collectors.joining(" "));
    }

    String generateQualifiers(@NonNull Item item) {
        val buf = new StringBuilder();
        buf.append("[");
        buf.append(item.getKind().name().toLowerCase(Locale.ROOT));

        Optional.ofNullable(item.getElement().getQualifiers())
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
        Optional.of(link.getQualifiers())
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

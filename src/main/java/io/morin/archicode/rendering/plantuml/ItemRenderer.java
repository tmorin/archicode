package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.RenderingShape;
import io.morin.archicode.rendering.ViewRenderer;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.Locale;
import java.util.Optional;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
class ItemRenderer {

    @NonNull
    @Builder.Default
    AtomicItemRenderer atomicItemRenderer = AtomicItemRenderer.builder().build();

    @NonNull
    @Builder.Default
    CompositeItemRenderer compositeItemRenderer = CompositeItemRenderer.builder().build();

    String render(@NonNull Viewpoint viewpoint, @NonNull PlantumlNames names, @NonNull Item item) {
        val buf = new StringBuilder();

        if (item.getChildren().isEmpty()) {
            buf.append(atomicItemRenderer.render(viewpoint, names, item));
        } else {
            buf.append(compositeItemRenderer.render(viewpoint, names, item));
        }

        return buf.toString();
    }

    @Slf4j
    @Builder
    @RequiredArgsConstructor
    @FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
    static class AtomicItemRenderer {

        String render(@NonNull Viewpoint viewpoint, @NonNull PlantumlNames names, @NonNull Item item) {
            log.debug("render atomic {}", item);

            val buf = new StringBuilder();

            val atomicFormatter = viewpoint.getWorkspace().getFormatters().getAtomic();

            val shape = RenderingShape.valueOf(
                item
                    .getElement()
                    .getTags()
                    .getOrDefault(ViewRenderer.TAG_RENDERING_SHAPE, RenderingShape.getDefault(item).name())
                    .toUpperCase(Locale.ROOT)
            )
                .name()
                .toLowerCase(Locale.ROOT);

            // <shape> <id> <stereotypes> <<atomic>> [
            buf.append(shape);
            buf.append(" ");
            buf.append(names.of(item));
            buf.append(" ");
            buf.append(
                PlantumlUtilities.generateStereotypes(
                    ChangeMarks.stereotypes(viewpoint, item),
                    item.getKind().name().toLowerCase(Locale.ROOT),
                    "atomic"
                )
            );
            buf.append(" [");
            buf.append(System.lineSeparator());

            // <name>, with the glyph of what changed when the view compares two plateaus
            buf.append(
                String.format(
                    atomicFormatter.getName(),
                    ChangeMarks.title(
                        ChangeMarks.stateOf(viewpoint, item),
                        Optional.ofNullable(item.getElement().getName()).orElse(item.getElement().getId()),
                        item
                    )
                )
            );
            buf.append(System.lineSeparator());

            // <qualifiers>
            buf.append(String.format(atomicFormatter.getQualifiers(), PlantumlUtilities.generateQualifiers(item)));
            buf.append(System.lineSeparator());

            // <description>
            Optional.ofNullable(item.getElement().getDescription())
                .filter(s -> !s.isBlank())
                .ifPresent(s -> {
                    buf.append(String.format(atomicFormatter.getDescription(), item.getElement().getDescription()));
                    buf.append(System.lineSeparator());
                });

            buf.append("]");
            buf.append(System.lineSeparator());

            return buf.toString();
        }
    }

    @Slf4j
    @Builder
    @RequiredArgsConstructor
    @FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
    static class CompositeItemRenderer {

        @NonNull
        @Builder.Default
        RenderingShape shape = RenderingShape.RECTANGLE;

        String render(@NonNull Viewpoint viewpoint, @NonNull PlantumlNames names, @NonNull Item item) {
            log.debug("render composite {}", item);

            val buf = new StringBuilder();

            val compositeFormatter = viewpoint.getWorkspace().getFormatters().getComposite();

            // <code>rectangle <id> as "<label>\n<qualifiers>" <<stereotypes>> {</code>
            buf.append(shape.name().toLowerCase(Locale.ROOT));
            buf.append(" ");
            buf.append(names.of(item));
            buf.append(" as \"");
            buf.append(
                String.format(
                    compositeFormatter.getName(),
                    ChangeMarks.title(
                        ChangeMarks.stateOf(viewpoint, item),
                        Optional.ofNullable(item.getElement().getName()).orElse(item.getElement().getId()),
                        item
                    )
                )
            );
            buf.append("\\n");
            buf.append(String.format(compositeFormatter.getQualifiers(), PlantumlUtilities.generateQualifiers(item)));
            buf.append("\" ");
            buf.append(PlantumlUtilities.generateStereotypes(ChangeMarks.stereotypes(viewpoint, item), "composite"));
            buf.append(" {");
            buf.append(System.lineSeparator());

            // render children
            ItemRenderer itemRenderer = ItemRenderer.builder().build();
            item.getChildren()
                .stream()
                .sorted()
                .toList()
                .forEach(child -> buf.append(itemRenderer.render(viewpoint, names, child)));

            buf.append("}");
            buf.append(System.lineSeparator());

            return buf.toString();
        }
    }
}

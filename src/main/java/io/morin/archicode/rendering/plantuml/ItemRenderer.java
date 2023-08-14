package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.RenderingShape;
import io.morin.archicode.rendering.ViewRenderer;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Viewpoint;
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

    String render(@NonNull Viewpoint viewpoint, @NonNull Item item) {
        val buf = new StringBuilder();

        if (item.getChildren().isEmpty()) {
            buf.append(atomicItemRenderer.render(viewpoint, item));
        } else {
            buf.append(compositeItemRenderer.render(viewpoint, item));
        }

        return buf.toString();
    }

    @Slf4j
    @Builder
    @RequiredArgsConstructor
    @FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
    static class AtomicItemRenderer {

        String render(@NonNull Viewpoint viewpoint, @NonNull Item item) {
            log.debug("render atomic {}", item);

            val buf = new StringBuilder();

            val atomicFormatter = viewpoint.getWorkspace().getFormatters().getAtomic();

            val shape = RenderingShape
                .valueOf(
                    item
                        .getElement()
                        .getTags()
                        .getOrDefault(ViewRenderer.TAG_RENDERING_SHAPE, RenderingShape.getDefault(item).name())
                        .toUpperCase()
                )
                .name()
                .toLowerCase();

            // <shape> <id> <stereotypes> <<atomic>> [
            buf.append(shape);
            buf.append(" ");
            buf.append(item.getItemId());
            buf.append(" ");
            buf.append(PlantumlUtilities.generateStereotypes(item, item.getKind().name().toLowerCase(), "atomic"));
            buf.append(" [");
            buf.append(System.lineSeparator());

            // <name>
            buf.append(
                String.format(
                    atomicFormatter.getName(),
                    Optional.ofNullable(item.getElement().getName()).orElse(item.getElement().getId())
                )
            );
            buf.append(System.lineSeparator());

            // <qualifiers>
            buf.append(String.format(atomicFormatter.getQualifiers(), PlantumlUtilities.generateQualifiers(item)));
            buf.append(System.lineSeparator());

            // <description>
            Optional
                .ofNullable(item.getElement().getDescription())
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

        String render(@NonNull Viewpoint viewpoint, @NonNull Item item) {
            log.debug("render composite {}", item);

            val buf = new StringBuilder();

            val compositeFormatter = viewpoint.getWorkspace().getFormatters().getComposite();

            // rectangle <id> as "<label>\n<qualifiers>" <<stereotypes>> {
            buf.append(shape.name().toLowerCase());
            buf.append(" ");
            buf.append(item.getItemId());
            buf.append(" as \"");
            buf.append(
                String.format(
                    compositeFormatter.getName(),
                    Optional.ofNullable(item.getElement().getName()).orElse(item.getElement().getId())
                )
            );
            buf.append("\\n");
            buf.append(String.format(compositeFormatter.getQualifiers(), PlantumlUtilities.generateQualifiers(item)));
            buf.append("\" ");
            buf.append(PlantumlUtilities.generateStereotypes(item, "composite"));
            buf.append(" {");
            buf.append(System.lineSeparator());

            // render children
            ItemRenderer itemRenderer = ItemRenderer.builder().build();
            item
                .getChildren()
                .stream()
                .sorted()
                .toList()
                .forEach(child -> buf.append(itemRenderer.render(viewpoint, child)));

            buf.append("}");
            buf.append(System.lineSeparator());

            return buf.toString();
        }
    }
}

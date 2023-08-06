package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.RenderingShape;
import io.morin.archicode.viewpoint.Item;
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

    String render(@NonNull Item item) {
        val buf = new StringBuilder();

        if (item.getChildren().isEmpty()) {
            buf.append(atomicItemRenderer.render(item));
        } else {
            buf.append(compositeItemRenderer.render(item));
        }

        return buf.toString();
    }

    @Slf4j
    @Builder
    @RequiredArgsConstructor
    @FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
    static class AtomicItemRenderer {

        @NonNull
        @Builder.Default
        RenderingShape shape = RenderingShape.getDefault();

        String render(@NonNull Item item) {
            val buf = new StringBuilder();

            // <shape> <id> <stereotypes> <<atomic>> [
            buf.append(shape.name().toLowerCase());
            buf.append(" ");
            buf.append(item.getItemId());
            buf.append(" ");
            buf.append(PlantumlUtilities.generateStereotypes(item, item.getKind().name().toLowerCase(), "atomic"));
            buf.append(" [");
            buf.append(System.lineSeparator());

            // **<name>**
            buf.append("**");
            buf.append(Optional.ofNullable(item.getElement().getName()).orElse(item.getItemId()));
            buf.append("**");
            buf.append(System.lineSeparator());

            // <qualifiers>
            buf.append(PlantumlUtilities.generateQualifiers(item));
            buf.append(System.lineSeparator());

            // <description>
            Optional
                .ofNullable(item.getElement().getDescription())
                .filter(s -> !s.isBlank())
                .ifPresent(s -> {
                    buf.append(String.format("%s", item.getElement().getDescription()));
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

        String render(@NonNull Item item) {
            val buf = new StringBuilder();

            // rectangle <id> as "<label>\n<qualifiers>" <<stereotypes>> {
            buf.append(shape.name().toLowerCase());
            buf.append(" ");
            buf.append(item.getItemId());
            buf.append(" as \"");
            buf.append(Optional.ofNullable(item.getElement().getName()).orElse(item.getItemId()));
            buf.append("\\n");
            buf.append(PlantumlUtilities.generateQualifiers(item));
            buf.append("\" ");
            buf.append(PlantumlUtilities.generateStereotypes(item, "composite"));
            buf.append(" {");
            buf.append(System.lineSeparator());

            // render children
            ItemRenderer itemRenderer = ItemRenderer.builder().build();
            item.getChildren().forEach(child -> buf.append(itemRenderer.render(child)));

            buf.append("}");
            buf.append(System.lineSeparator());

            return buf.toString();
        }
    }
}

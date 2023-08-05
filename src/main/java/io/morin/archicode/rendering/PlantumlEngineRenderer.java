package io.morin.archicode.rendering;

import io.morin.archicode.context.Context;
import io.morin.archicode.context.Item;
import io.morin.archicode.context.Link;
import io.morin.archicode.workspace.Styles;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class PlantumlEngineRenderer implements EngineRenderer {

    @Override
    @SneakyThrows
    public void render(Context context, OutputStream outputStream) {
        try (val outputStreamWriter = new OutputStreamWriter(outputStream)) {
            outputStreamWriter.write("@startuml");
            outputStreamWriter.write(System.lineSeparator());

            outputStreamWriter.write("skinparam defaultTextAlignment center");
            outputStreamWriter.write(System.lineSeparator());
            outputStreamWriter.write("skinparam wrapWidth 200");
            outputStreamWriter.write(System.lineSeparator());
            outputStreamWriter.write("skinparam maxMessageSize 150");
            outputStreamWriter.write(System.lineSeparator());

            outputStreamWriter.write("hide stereotype");
            outputStreamWriter.write(System.lineSeparator());

            for (Item item : context.getItems()) {
                outputStreamWriter.write(renderItem(context, item));
            }

            outputStreamWriter.write(System.lineSeparator());

            for (Link link : context.getLinks()) {
                outputStreamWriter.write(renderLink(context, link));
            }

            for (Map.Entry<String, Styles.Style> entry : context.getWorkspace().getStyles().getByTags().entrySet()) {
                outputStreamWriter.write(renderSkinparam(entry, "rectangle"));
                outputStreamWriter.write(renderSkinparam(entry, "database"));
                outputStreamWriter.write(renderSkinparam(entry, "card"));
                outputStreamWriter.write(renderSkinparam(entry, "node"));
            }

            outputStreamWriter.write("@enduml");
            outputStreamWriter.write(System.lineSeparator());
        }
    }

    private static String renderSkinparam(Map.Entry<String, Styles.Style> entry, String shape) {
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

    @SneakyThrows
    private String renderItem(Context context, Item item) {
        val buf = new StringBuilder();

        val stereotypes = new HashSet<>(item.getElement().getQualifiers());
        stereotypes.add(item.getKind().toString().toLowerCase());
        val stereotypesAsString = String.join(
            " ",
            stereotypes.stream().map(value -> String.format("<<%s>>", value)).collect(Collectors.toSet())
        );

        if (item.getChildren().isEmpty()) {
            val shape = item.getElement().getTags().getOrDefault(TAG_RENDERING_SHAPE, "rectangle");
            buf.append(String.format("%s %s %s [", shape, item.getItemId(), stereotypesAsString));
            buf.append(System.lineSeparator());

            buf.append("**");
            buf.append(Optional.ofNullable(item.getElement().getName()).orElse(item.getItemId()));
            buf.append("**");
            buf.append(System.lineSeparator());

            buf.append(PlantumlUtilities.generateQualifiers(item));
            buf.append(System.lineSeparator());

            Optional
                .ofNullable(item.getElement().getDescription())
                .filter(s -> !s.isBlank())
                .ifPresent(s -> {
                    buf.append(String.format("%s", item.getElement().getDescription()));
                    buf.append(System.lineSeparator());
                });

            buf.append("]");
            buf.append(System.lineSeparator());
        } else {
            buf.append(
                String.format(
                    "rectangle %s as \"%s\\n%s\" %s {",
                    item.getItemId(),
                    Optional.ofNullable(item.getElement().getName()).orElse(item.getItemId()),
                    PlantumlUtilities.generateQualifiers(item),
                    stereotypesAsString
                )
            );
            buf.append(System.lineSeparator());

            item.getChildren().forEach(child -> buf.append(renderItem(context, child)));

            buf.append("}");
            buf.append(System.lineSeparator());
        }
        return buf.toString();
    }

    private String renderLink(Context context, Link link) {
        val buf = new StringBuilder();

        buf.append(link.getFrom().getItemId());
        buf.append(" --> ");
        buf.append(link.getTo().getItemId());

        val descriptionAsList = new ArrayList<String>();
        Optional
            .ofNullable(link.getLabel())
            .filter(v -> !v.isBlank())
            .map(label -> String.format("**%s**", label))
            .ifPresent(descriptionAsList::add);
        Optional
            .of(PlantumlUtilities.generateQualifiers(link))
            .filter(v -> !v.isBlank())
            .ifPresent(descriptionAsList::add);
        Optional
            .of(String.join("\\n", descriptionAsList))
            .filter(v -> !v.isBlank())
            .ifPresent(description -> {
                buf.append(" : ");
                buf.append(description);
            });

        buf.append(System.lineSeparator());
        return buf.toString();
    }
}

package io.morin.archcode.rendering;

import io.morin.archcode.context.Context;
import io.morin.archcode.context.Item;
import io.morin.archcode.context.Link;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.util.List;
import java.util.Optional;
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

            outputStreamWriter.write("hide stereotype");
            outputStreamWriter.write(System.lineSeparator());

            for (Item item : context.getItems()) {
                outputStreamWriter.write(renderItem(item));
            }

            outputStreamWriter.write(System.lineSeparator());

            for (Link link : context.getLinks()) {
                outputStreamWriter.write(renderLink(link));
            }

            outputStreamWriter.write("@enduml");
            outputStreamWriter.write(System.lineSeparator());
        }
    }

    @SneakyThrows
    private String renderItem(Item item) {
        val buf = new StringBuilder();

        val stereotypes = String.join(" ", List.of(String.format("<<%s>>", item.getKind())));

        if (item.getChildren().isEmpty()) {
            buf.append(String.format("rectangle %s %s [", item.getItemId(), stereotypes));
            buf.append(System.lineSeparator());

            buf.append(Optional.ofNullable(item.getElement().getName()).orElse(item.getItemId()));
            buf.append(System.lineSeparator());

            buf.append(PlantumlUtilities.generateTechnology(item));
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
                    "rectangle %s as \"%s\" %s {",
                    item.getItemId(),
                    Optional.ofNullable(item.getElement().getName()).orElse(item.getItemId()),
                    stereotypes
                )
            );
            buf.append(System.lineSeparator());

            item.getChildren().forEach(child -> buf.append(renderItem(child)));

            buf.append("}");
            buf.append(System.lineSeparator());
        }
        return buf.toString();
    }

    private String renderLink(Link link) {
        val buf = new StringBuilder();

        buf.append(link.getFrom().getItemId());
        buf.append(" --> ");
        buf.append(link.getTo().getItemId());

        Optional
            .ofNullable(link.getLabel())
            .filter(v -> !v.isBlank())
            .ifPresent(description -> {
                buf.append(" : ");
                buf.append(description);
            });

        buf.append(System.lineSeparator());

        return buf.toString();
    }
}

package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.ViewRenderer;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Map;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class PlantumlViewRenderer implements ViewRenderer {

    @Builder.Default
    TitleRenderer titleRenderer = TitleRenderer.builder().build();

    @Builder.Default
    StyleRenderer styleRenderer = StyleRenderer.builder().build();

    @Builder.Default
    StyleShapeRenderer styleShapeRenderer = StyleShapeRenderer.builder().build();

    @Builder.Default
    ItemRenderer itemRenderer = ItemRenderer.builder().build();

    @Builder.Default
    LinkRenderer linkRenderer = LinkRenderer.builder().build();

    @Override
    @SneakyThrows
    public void render(@NonNull Viewpoint viewpoint, @NonNull Path outputPath) {
        val plantumlViewId = viewpoint.getView().getId().replace(".", "_");
        val outputPumlFile = Path.of(outputPath.toString(), String.format("%s.puml", plantumlViewId));

        try (val outputStream = new FileOutputStream(outputPumlFile.toFile())) {
            try (val outputStreamWriter = new OutputStreamWriter(outputStream)) {
                outputStreamWriter.write(String.format("@startuml %s", plantumlViewId));
                outputStreamWriter.write(System.lineSeparator());

                outputStreamWriter.write(titleRenderer.render(viewpoint));

                outputStreamWriter.write(styleRenderer.render(viewpoint));

                for (Item item : viewpoint.getItems().stream().sorted().toList()) {
                    outputStreamWriter.write(itemRenderer.render(viewpoint, item));
                }

                for (Link link : viewpoint
                    .getLinks()
                    .stream()
                    .sorted()
                    .filter(link -> link.getTags().getOrDefault("rendering-secondary", "yes").equals("yes"))
                    .toList()) {
                    outputStreamWriter.write(linkRenderer.render(viewpoint, link));
                }

                val entries = new HashSet<Map.Entry<String, Styles.Style>>();
                entries.addAll(viewpoint.getWorkspace().getStyles().getByQualifiers().entrySet());
                entries.addAll(viewpoint.getWorkspace().getStyles().getByTags().entrySet());
                for (Map.Entry<String, Styles.Style> entry : entries) {
                    outputStreamWriter.write(styleShapeRenderer.render("actor", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("card", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("database", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("node", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("person", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("rectangle", entry));
                }

                outputStreamWriter.write("@enduml");
                outputStreamWriter.write(System.lineSeparator());
            }
        }
    }
}

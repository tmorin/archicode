package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.rendering.ViewRenderer;
import io.morin.archicode.resource.workspace.Styles;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.file.Path;
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
        val outputPumlFile = Path.of(outputPath.toString(), String.format("%s.puml", viewpoint.getView().getViewId()));

        try (val outputStream = new FileOutputStream(outputPumlFile.toFile())) {
            try (val outputStreamWriter = new OutputStreamWriter(outputStream)) {
                outputStreamWriter.write(String.format("@startuml %s", viewpoint.getView().getViewId()));
                outputStreamWriter.write(System.lineSeparator());

                outputStreamWriter.write(titleRenderer.render(viewpoint));

                outputStreamWriter.write(styleRenderer.render());

                for (Item item : viewpoint.getItems()) {
                    outputStreamWriter.write(itemRenderer.render(item));
                }

                for (Link link : viewpoint.getLinks()) {
                    outputStreamWriter.write(linkRenderer.render(link));
                }

                for (Map.Entry<String, Styles.Style> entry : viewpoint
                    .getWorkspace()
                    .getStyles()
                    .getByTags()
                    .entrySet()) {
                    outputStreamWriter.write(styleShapeRenderer.render("rectangle", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("database", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("card", entry));
                    outputStreamWriter.write(styleShapeRenderer.render("node", entry));
                }

                outputStreamWriter.write("@enduml");
                outputStreamWriter.write(System.lineSeparator());
            }
        }
    }
}

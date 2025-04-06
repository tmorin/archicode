package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
@SuppressWarnings("java:S125")
class CustomRenderingTest {

    @Inject
    GenerateViewsCommand generateViewsCommand;

    @SneakyThrows
    @Test
    void mayRenderCustom() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of(".custom/workspace.yaml");
        val views = new ViewsGroup();
        views.archiCode = archiCode;
        generateViewsCommand.viewsGroup = views;
        //        generateViewsCommand.viewsDirPath = Path.of("views");
        generateViewsCommand.rendererName = "plantuml";
        //generateViewsCommand.viewPropertiesAsContent = "{ \"show-application-links\": false }";
        //generateViewsCommand.viewPropertiesFormat = MapperFormat.JSON;
        //generateViewsCommand.viewPropertiesAsPath = "view-properties.yaml";
        //        generateViewsCommand.viewIds = Set.of("ref_swisscom_esc_postgresql-deep");
        if (archiCode.workspaceFilePath.toFile().exists()) {
            Assertions.assertDoesNotThrow(generateViewsCommand::run);
        }
    }
}

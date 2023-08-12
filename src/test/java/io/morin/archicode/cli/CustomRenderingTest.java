package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    GenerateViewsCommand generateViewsCommand;

    @SneakyThrows
    @Test
    void mayRenderCustom() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of(".custom/cara.yaml");
        val views = new ViewsGroup();
        views.archiCode = archiCode;
        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.viewsDirPath = Path.of("views");
        generateViewsCommand.rendererName = "plantuml";
        generateViewsCommand.viewPropertiesAsJson = "{ \"show-application-links\": false }";
        generateViewsCommand.viewPropertiesFormat = MapperFormat.JSON;
        generateViewsCommand.viewIds =
            Set.of(
                "reference.cloudprovider.cluster.authx.backend_deep",
                "reference.cloudprovider.cluster.authx.backend_detailed",
                "reference.cloudprovider.cluster.authx.backend_overview"
            );
        if (archiCode.workspaceFilePath.toFile().exists()) {
            generateViewsCommand.run();
        }
    }
}

package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    GenerateViews generateViews;

    @SneakyThrows
    @Test
    void mayRenderCustom() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of(".custom/acme.yaml");
        generateViews.archiCode = archiCode;
        generateViews.viewsDirPath = Path.of("views");
        generateViews.rendererName = "plantuml";
        generateViews.viewPropertiesAsJson = "{ \"show-application-links\": false }";
        generateViews.viewPropertiesFormat = MapperFormat.JSON;
        generateViews.viewIds =
            Set.of(
                "reference.cloudprovider.cluster.auth.backend_deep",
                "reference.cloudprovider.cluster.auth.backend_detailed",
                "reference.cloudprovider.cluster.auth.backend_overview"
            );
        if (archiCode.workspaceFilePath.toFile().exists()) {
            generateViews.run();
        }
    }
}

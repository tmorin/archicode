package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    RenderCommand renderCommand;

    @SneakyThrows
    @Test
    void mayRenderCustom() {
        ArchiCodeCommand archiCodeCommand = new ArchiCodeCommand();
        archiCodeCommand.workspaceFilePath = Path.of(".custom/cara.yaml");
        renderCommand.archiCodeCommand = archiCodeCommand;
        renderCommand.viewsDirPath = Path.of("views");
        renderCommand.rendererName = "plantuml";
        renderCommand.viewPropertiesAsJson = "{ \"show-application-links\": false }";
        if (archiCodeCommand.workspaceFilePath.toFile().exists()) {
            renderCommand.renderViews(
                Set.of(
                    "reference.cloudprovider.cluster.authx.backend_deep",
                    "reference.cloudprovider.cluster.authx.backend_detailed",
                    "reference.cloudprovider.cluster.authx.backend_overview"
                )
            );
        }
    }
}

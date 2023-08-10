package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.Set;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    RenderCommand renderCommand;

    @Test
    void mayRenderCustom() {
        ArchiCodeCommand archiCodeCommand = new ArchiCodeCommand();
        archiCodeCommand.workspaceFilePath = Path.of(".custom/acme.yaml");
        renderCommand.archiCodeCommand = archiCodeCommand;
        renderCommand.viewsDirPath = Path.of("views");
        renderCommand.rendererName = "plantuml";
        if (archiCodeCommand.workspaceFilePath.toFile().exists()) {
            renderCommand.renderViews(
                Set.of(
                    "reference.cloudprovider.cluster.auth.backend_deep",
                    "reference.cloudprovider.cluster.auth.backend_detailed",
                    "reference.cloudprovider.cluster.auth.backend_overview"
                )
            );
        }
    }
}

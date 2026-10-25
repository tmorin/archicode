package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CustomRenderingTest {

    @Inject
    GenerateViewsCommand generateViewsCommand;

    @SneakyThrows
    @Test
    void mayRenderCustom() {
        ArchiCode archiCode = new ArchiCode();
        // the author's own workspace (git-ignored): under the name it has since 0.18, else under the name it had before, as -w names it
        val renamed = Path.of(".custom/.archicode.yaml");
        archiCode.workspaceFilePath = renamed.toFile().exists() ? renamed : Path.of(".custom/workspace.yaml");
        val views = new ViewsGroup();
        views.archiCode = archiCode;
        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.rendererName = "plantuml";
        if (archiCode.workspaceFilePath.toFile().exists()) {
            Assertions.assertDoesNotThrow(generateViewsCommand::run);
        }
    }
}

package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.Fixtures;
import io.morin.archicode.rendering.RendererEngine;
import io.morin.archicode.workspace.WorkspaceMapperFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ArchiCodeCommandTest {

    @Inject
    RenderCommand renderCommand;

    @Inject
    WorkspaceMapperFactory workspaceMapperFactory;

    @BeforeEach
    @SneakyThrows
    void setUp() {
        val wksDir = Path.of("target", ArchiCodeCommandTest.class.getSimpleName());
        wksDir.toFile().mkdirs();
        val wksFile = Path.of("target", ArchiCodeCommandTest.class.getSimpleName(), "workspace.yaml");
        Files.writeString(
            wksFile,
            workspaceMapperFactory.create(wksFile).writeValueAsString(Fixtures.workspace_a),
            StandardCharsets.UTF_8
        );
        ArchiCodeCommand archiCodeCommand = new ArchiCodeCommand();
        archiCodeCommand.workspaceFilePath = wksFile;
        renderCommand.archiCodeCommand = archiCodeCommand;
        renderCommand.rendererEngine = RendererEngine.PLANTUML;
    }

    @Test
    void shouldRenderViews() {
        renderCommand.viewsDirPath = Path.of("shouldRenderViews");
        renderCommand.renderViews(Set.of("view_solution_a_overview"));
        assertTrue(
            Path
                .of("target/ArchiCodeCommandTest/shouldRenderViews/plantuml/view_solution_a_overview.puml")
                .toFile()
                .exists()
        );
    }

    @Test
    void shouldRenderPerspectives() {
        renderCommand.viewsDirPath = Path.of("shouldRenderPerspectives");
        renderCommand.renderPerspectives();
        assertTrue(
            Path
                .of("target/ArchiCodeCommandTest/shouldRenderPerspectives/plantuml/solution_a.system_a_a_overview.puml")
                .toFile()
                .exists()
        );
    }
}
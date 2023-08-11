package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.WorkspaceAFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ArchiCodeTest {

    @Inject
    GenerateViews generateViews;

    @Inject
    MapperFactory mapperFactory;

    @BeforeEach
    @SneakyThrows
    void setUp() {
        val wksDir = Path.of("target", ArchiCodeTest.class.getSimpleName());
        wksDir.toFile().mkdirs();
        val wksFile = Path.of("target", ArchiCodeTest.class.getSimpleName(), "resources.yaml");
        Files.writeString(
            wksFile,
            mapperFactory.create(wksFile).writeValueAsString(WorkspaceAFixtures.createWorkspace()),
            StandardCharsets.UTF_8
        );
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = wksFile;
        generateViews.archiCode = archiCode;
        generateViews.rendererName = "plantuml";
        generateViews.viewPropertiesFormat = MapperFormat.JSON;
    }

    @Test
    void shouldRenderViews() {
        generateViews.viewsDirPath = Path.of("shouldRenderViews");
        generateViews.viewIds = Set.of("view_solution_a_overview");
        generateViews.run();
        assertTrue(
            Path
                .of("target/ArchiCodeCommandTest/shouldRenderViews/plantuml/application/view_solution_a_overview.puml")
                .toFile()
                .exists()
        );
    }

    @Test
    void shouldRenderPerspectives() {
        generateViews.viewsDirPath = Path.of("shouldRenderPerspectives");
        generateViews.viewIds = Collections.emptySet();
        generateViews.run();
        assertTrue(
            Path
                .of(
                    "target/ArchiCodeCommandTest/shouldRenderPerspectives/plantuml/application/solution_a.system_a_a_overview.puml"
                )
                .toFile()
                .exists()
        );
    }
}

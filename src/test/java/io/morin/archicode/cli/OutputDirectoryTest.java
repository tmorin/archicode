package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@QuarkusTest
class OutputDirectoryTest {

    @Inject
    GenerateViewsCommand generateViewsCommand;

    @SneakyThrows
    private void generate(Path workspaceFile, Path output) {
        val archiCodeCommand = new ArchiCode();
        archiCodeCommand.workspaceFilePath = workspaceFile;
        val views = new ViewsGroup();
        views.archiCode = archiCodeCommand;
        generateViewsCommand.viewsGroup = views;
        generateViewsCommand.viewsDirPath = output;
        generateViewsCommand.rendererName = "plantuml";
        generateViewsCommand.viewPropertiesFormat = MapperFormat.JSON;
        generateViewsCommand.viewIds = Set.of();
        generateViewsCommand.run();
    }

    @SneakyThrows
    private Path copyWorkspace(Path dir) {
        val workspaceFile = dir.resolve("workspace.yaml");
        Files.copy(Path.of("src/test/workspaces/case_a.yaml"), workspaceFile);
        return workspaceFile;
    }

    @SneakyThrows
    private boolean hasViews(Path dir) {
        try (val files = Files.walk(dir)) {
            return files.anyMatch(f -> f.getFileName().toString().endsWith(".puml"));
        }
    }

    @SneakyThrows
    @Test
    void shouldResolveARelativeOutputBelowTheFolderOfTheWorkspace(@TempDir Path dir) {
        val workspaceFile = copyWorkspace(dir);
        generate(workspaceFile, Path.of("out"));
        assertTrue(hasViews(dir.resolve("out")));
    }

    @SneakyThrows
    @Test
    void shouldUseAnAbsoluteOutputAsItIs(@TempDir Path dir, @TempDir Path elsewhere) {
        val workspaceFile = copyWorkspace(dir);
        generate(workspaceFile, elsewhere);
        assertTrue(hasViews(elsewhere));
        assertFalse(Files.exists(dir.resolve(elsewhere.toString().replaceFirst("^/", ""))));
    }
}

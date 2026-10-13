package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The workspaces the manual includes are workspaces the tool loads. */
@QuarkusTest
class ManualExamplesTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @SneakyThrows
    @Test
    void shouldLoadEveryWorkspaceOfTheManual() {
        List<Path> workspaces;
        try (val files = Files.walk(Path.of("src/doc/examples"))) {
            workspaces = files.filter(f -> f.getFileName().toString().equals("workspace.yaml")).toList();
        }
        for (val workspace : workspaces) {
            assertDoesNotThrow(() -> workspaceFactory.create(workspace.toAbsolutePath()), workspace.toString());
        }
    }
}

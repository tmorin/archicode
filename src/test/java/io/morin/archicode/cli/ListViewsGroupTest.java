package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ListViewsGroupTest {

    @Inject
    ListViewsCommand listViewsCommand;

    @Test
    void shouldList() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of("src/test/workspaces/case_a.yaml");
        val views = new ViewsGroup();
        views.archiCode = archiCode;
        listViewsCommand.viewsGroup = views;
        listViewsCommand.outputFormat = MapperFormat.YAML;
        Assertions.assertDoesNotThrow(listViewsCommand::run);
    }
}

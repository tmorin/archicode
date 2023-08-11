package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ListViewsTest {

    @Inject
    ListViews listViews;

    @Test
    void shouldList() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of("src/test/workspaces/case_a.yaml");
        listViews.archiCode = archiCode;
        listViews.outputFormat = MapperFormat.YAML;
        Assertions.assertDoesNotThrow(listViews::run);
    }
}

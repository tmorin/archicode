package io.morin.archicode.cli;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GetViewsQueryTest {

    @Inject
    GetViewsQuery getViewsQuery;

    @Test
    void shouldOutputCustom() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of("src/test/workspaces/case_a.yaml");
        val views = new QueryGroup();
        views.archiCode = archiCode;
        getViewsQuery.queryGroup = views;
        getViewsQuery.outputFormat = OutputFormat.CUSTOM;
        getViewsQuery.query = "$.[0]";
        getViewsQuery.template = """
        $d.e("$.viewpoint") : $d.e("$.id")
        """;
        Assertions.assertDoesNotThrow(getViewsQuery::run);
    }

    @Test
    void shouldOutputYaml() {
        ArchiCode archiCode = new ArchiCode();
        archiCode.workspaceFilePath = Path.of("src/test/workspaces/case_a.yaml");
        val views = new QueryGroup();
        views.archiCode = archiCode;
        getViewsQuery.queryGroup = views;
        getViewsQuery.outputFormat = OutputFormat.YAML;
        getViewsQuery.query = "$.[0]";
        Assertions.assertDoesNotThrow(getViewsQuery::run);
    }
}

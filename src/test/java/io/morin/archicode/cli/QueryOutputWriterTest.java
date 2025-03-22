package io.morin.archicode.cli;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.WorkspaceAFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@Slf4j
@QuarkusTest
class QueryOutputWriterTest {

    @Inject
    MapperFactory mapperFactory;

    @Test
    @SneakyThrows
    void shouldRenderTemplate() {
        val jsonMapper = mapperFactory.create(MapperFormat.JSON).writerWithDefaultPrettyPrinter();
        val system_a_aAsString = jsonMapper.writeValueAsString(WorkspaceAFixtures.system_a_a);
        log.info("system_a_aAsString {}", system_a_aAsString);
        val template =
            """
            $d.e("$.relationships[*].destination")
            """;
        val result = QueryOutputWriter.TemplateUtilities.render(template, system_a_aAsString);
        log.info("result {}", result);
        Assertions.assertTrue(result.contains("solution_b"));
        Assertions.assertTrue(result.contains("solution_c"));
    }

    @Test
    @SneakyThrows
    void shouldRenderTemplateBis() {
        val jsonMapper = mapperFactory.create(MapperFormat.JSON).writerWithDefaultPrettyPrinter();
        val workspaceAsString = jsonMapper.writeValueAsString(WorkspaceAFixtures.createWorkspace());
        log.info("workspaceAsString {}", workspaceAsString);
        val template =
            """
            $d.e("$.application.elements[*].elements[*].['kind', 'id']")
            """;
        val result = QueryOutputWriter.TemplateUtilities.render(template, workspaceAsString);
        log.info("result {}", result);
        Assertions.assertTrue(result.contains("\"kind\":\"system\",\"id\":\"system_a_a\""));
        Assertions.assertTrue(result.contains("\"kind\":\"system\",\"id\":\"system_a_b\""));
    }
}

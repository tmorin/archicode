package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GetSchemasQueryTest {

    @Inject
    GetSchemasQuery getSchemasQuery;

    @Inject
    MapperFactory mapperFactory;

    @Test
    @SneakyThrows
    void theSchemaOfTheWorkspaceNoLongerDescribesAListOfPlateaus() {
        val writer = mapperFactory.create(MapperFormat.JSON).writerWithDefaultPrettyPrinter();
        val schema = mapperFactory
            .create(MapperFormat.JSON)
            .readTree(
                writer.writeValueAsString(getSchemasQuery.generateSchema(GetSchemasQuery.SchemaType.WORKSPACE, writer))
            );
        val settings = schema.at("/properties/settings");
        assertEquals("string", settings.at("/properties/current/type").asText());
        // a plateau is a layer now (a header and a manifest): the settings list none
        assertEquals("", settings.at("/properties/plateaus/type").asText());
        assertTrue(settings.at("/properties/plateaus/items").isMissingNode());
    }

    @Test
    void shouldWriteSchemaForWorkspace() {
        getSchemasQuery.type = GetSchemasQuery.SchemaType.WORKSPACE;
        assertDoesNotThrow(getSchemasQuery::run);
    }

    @Test
    void shouldWriteSchemaForManifest() {
        getSchemasQuery.type = GetSchemasQuery.SchemaType.MANIFEST;
        assertDoesNotThrow(getSchemasQuery::run);
    }
}

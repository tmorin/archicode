package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

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
    void theSchemaOfTheWorkspaceDescribesThePlateaus() {
        val writer = mapperFactory.create(MapperFormat.JSON).writerWithDefaultPrettyPrinter();
        val schema = mapperFactory
            .create(MapperFormat.JSON)
            .readTree(
                writer.writeValueAsString(getSchemasQuery.generateSchema(GetSchemasQuery.SchemaType.WORKSPACE, writer))
            );
        val settings = schema.at("/properties/settings");
        assertEquals("array", settings.at("/properties/plateaus/type").asText());
        assertEquals("string", settings.at("/properties/current/type").asText());
        val plateau = settings.at("/properties/plateaus/items");
        for (val key : new String[] { "id", "name", "horizon", "path" }) {
            assertEquals("string", plateau.at("/properties/" + key + "/type").asText(), key);
        }
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

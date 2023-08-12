package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

@QuarkusTest
class GetSchemasQueryTest {

    @Inject
    GetSchemasQuery getSchemasQuery;

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

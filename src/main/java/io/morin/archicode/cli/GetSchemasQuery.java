package io.morin.archicode.cli;

import com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchemaGenerator;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.resource.workspace.Workspace;
import jakarta.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(name = "schemas", description = "Get JSON schemas related to the ArchiCode data model.")
@SuppressWarnings("java:S6813")
public class GetSchemasQuery implements Runnable {

    @Inject
    QueryOutputWriter queryOutputWriter;

    @Inject
    MapperFactory mapperFactory;

    enum SchemaType {
        WORKSPACE,
        MANIFEST
    }

    static class SchemaTypeConverter implements CommandLine.ITypeConverter<SchemaType> {

        @Override
        public SchemaType convert(String value) {
            return SchemaType.valueOf(value.toUpperCase());
        }
    }

    @CommandLine.Parameters(
        description = "The type of the JSON Schema.",
        paramLabel = "TYPE",
        defaultValue = "workspace",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        converter = SchemaTypeConverter.class
    )
    SchemaType type;

    @SneakyThrows
    @Override
    public void run() {
        val mapper = mapperFactory.create(MapperFormat.JSON).writerWithDefaultPrettyPrinter();
        val schema = generateSchema(type);
        val schemaAsJson = mapper.writeValueAsString(schema);
        queryOutputWriter.write(schemaAsJson);
    }

    /**
     * Generate the JSON Schema for the given {@link SchemaType}.
     * <p>
     * Reused by {@link EditorHttpServer}'s {@code GET /api/schemas/{type}} endpoint so the HTTP surface and the
     * {@code query schemas} CLI command share the exact same schema-generation logic.
     *
     * @param type the type of schema to generate
     * @return the generated schema
     */
    @SneakyThrows
    public com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchema generateSchema(SchemaType type) {
        val mapper = mapperFactory.create(MapperFormat.JSON).writerWithDefaultPrettyPrinter();
        val schemaGen = new JsonSchemaGenerator(mapper);
        return switch (type) {
            case WORKSPACE -> schemaGen.generateSchema(Workspace.class);
            case MANIFEST -> schemaGen.generateSchema(Manifest.class);
        };
    }
}

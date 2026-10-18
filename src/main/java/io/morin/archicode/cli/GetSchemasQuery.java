package io.morin.archicode.cli;

import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchema;
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
        val mapper = sortedWriter(mapperFactory);
        val schema = generateSchema(type, mapper);
        val schemaAsJson = mapper.writeValueAsString(schema);
        queryOutputWriter.write(schemaAsJson);
    }

    /**
     * The JSON writer the schemas are generated and written with: the JSON mapper of the application, with the
     * properties of an object in alphabetical order.
     * <p>
     * The generator lists the properties of an object in the order Jackson finds them, and for a type that is an
     * interface (the elements, which are described by their getters) that is the order of {@code getDeclaredMethods},
     * which the JVM does not fix: about one run in three listed {@code description} before the other properties and
     * the others after them. Sorting them by name makes the schema the same from one run to the next, and from one
     * build to the next (a native image keeps the order its build saw).
     *
     * @return the writer, with a pretty printer
     */
    static ObjectWriter sortedWriter(MapperFactory mapperFactory) {
        return mapperFactory
            .create(MapperFormat.JSON)
            .copy()
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .writerWithDefaultPrettyPrinter();
    }

    /**
     * Generate the JSON Schema for the given {@link SchemaType}.
     * <p>
     * Kept apart from the command so that a schema can be generated without writing it out.
     *
     * @param type   the type of schema to generate
     * @param mapper the JSON writer the schema is generated with
     * @return the generated schema
     */
    @SneakyThrows
    public JsonSchema generateSchema(SchemaType type, ObjectWriter mapper) {
        val schemaGen = new JsonSchemaGenerator(mapper);
        return switch (type) {
            case WORKSPACE -> schemaGen.generateSchema(Workspace.class);
            case MANIFEST -> schemaGen.generateSchema(Manifest.class);
        };
    }
}

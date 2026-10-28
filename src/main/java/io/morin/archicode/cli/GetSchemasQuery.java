package io.morin.archicode.cli;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchema;
import com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchemaGenerator;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.ManifestSchema;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.workspace.Workspace;
import jakarta.inject.Inject;
import java.util.Locale;
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

    public enum SchemaType {
        WORKSPACE,
        MANIFEST
    }

    static class SchemaTypeConverter implements CommandLine.ITypeConverter<SchemaType> {

        @Override
        public SchemaType convert(String value) {
            return SchemaType.valueOf(value.toUpperCase(Locale.ROOT));
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
        val writer = sortedWriter(mapperFactory);
        val schema = generateSchema(type, writer);
        val schemaAsJson = writer.writeValueAsString(schema);
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
    public static ObjectWriter sortedWriter(MapperFactory mapperFactory) {
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
     * @return the generated schema: a {@link JsonSchema} for the workspace, the tree of {@link ManifestSchema} for the manifests
     */
    @SneakyThrows
    public Object generateSchema(SchemaType type, ObjectWriter mapper) {
        return switch (type) {
            case WORKSPACE -> new JsonSchemaGenerator(withoutStepHighlight()).generateSchema(Workspace.class);
            case MANIFEST -> ManifestSchema.generate(mapperFactory.create(MapperFormat.JSON), mapper);
        };
    }

    /**
     * The mapper the schema of the workspace is generated with: it does not see the {@code highlight} of a story step (wave 026,
     * run 0198), because that schema is the one of the last release, byte for byte (wave 022, T1); the schema of the manifests
     * lists the key.
     */
    private ObjectMapper withoutStepHighlight() {
        return mapperFactory
            .create(MapperFormat.JSON)
            .copy()
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .addMixIn(Story.Step.class, StepWithoutHighlight.class);
    }

    /** The mix-in that hides the {@code highlight} of a step from the schema of the workspace. */
    private interface StepWithoutHighlight {
        @JsonIgnore
        JsonNode getHighlight();
    }
}

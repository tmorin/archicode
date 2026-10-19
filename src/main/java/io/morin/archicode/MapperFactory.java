package io.morin.archicode;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.EnumFeature;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.jsontype.TypeDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.dataformat.toml.TomlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.morin.archicode.manifest.AliasExpandingYamlFactory;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.ContainerElement;
import io.morin.archicode.resource.element.application.SolutionElement;
import io.morin.archicode.resource.element.application.SystemElement;
import io.morin.archicode.resource.element.technology.EnvironmentElement;
import io.morin.archicode.resource.element.technology.NodeElement;
import io.morin.archicode.resource.element.technology.TechnologyElement;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class MapperFactory {

    YAMLMapper yamlMapper = reading(
        YAMLMapper.builder(new AliasExpandingYamlFactory())
            .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .serializationInclusion(JsonInclude.Include.NON_EMPTY)
            .build()
    );
    YAMLMapper yamlMapperLazy = reading(
        YAMLMapper.builder(new AliasExpandingYamlFactory())
            .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .serializationInclusion(JsonInclude.Include.NON_EMPTY)
            .build()
    );
    TomlMapper tomlMapper = reading(
        TomlMapper.builder()
            .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .serializationInclusion(JsonInclude.Include.NON_EMPTY)
            .build()
    );
    TomlMapper tomlMapperLazy = reading(
        TomlMapper.builder()
            .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .serializationInclusion(JsonInclude.Include.NON_EMPTY)
            .build()
    );
    JsonMapper jsonMapper = reading(
        JsonMapper.builder()
            .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .serializationInclusion(JsonInclude.Include.NON_EMPTY)
            .build()
    );
    JsonMapper jsonMapperLazy = reading(
        JsonMapper.builder()
            .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .serializationInclusion(JsonInclude.Include.NON_EMPTY)
            .build()
    );

    /**
     * An element is an object whose {@code kind} says its type: the array form of a type id ({@code [kind, {...}]}), which Jackson
     * reads when the item of a list is a list, is not an element.
     */
    private static final SimpleModule NO_ARRAY_FOR_AN_ELEMENT = new SimpleModule("no-array-for-an-element");

    static {
        for (val type : List.<Class<?>>of(
            ApplicationElement.class,
            SystemElement.class,
            ContainerElement.class,
            SolutionElement.class,
            TechnologyElement.class,
            EnvironmentElement.class,
            NodeElement.class
        )) {
            register(type);
        }
    }

    private static <T> void register(Class<T> type) {
        NO_ARRAY_FOR_AN_ELEMENT.addDeserializer(type, new ElementIsNoArray<>(type));
    }

    /** Reads an element as Jackson does, but not from an array (see {@link #NO_ARRAY_FOR_AN_ELEMENT}). */
    private static final class ElementIsNoArray<T> extends StdDeserializer<T> {

        private final Class<T> type;

        ElementIsNoArray(Class<T> type) {
            super(type);
            this.type = type;
        }

        @Override
        public T deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            return ctxt.reportInputMismatch(
                type,
                "Cannot deserialize value of type `%s` from %s",
                type.getName(),
                p.currentToken()
            );
        }

        @Override
        public Object deserializeWithType(JsonParser p, DeserializationContext ctxt, TypeDeserializer typeDeserializer)
            throws IOException {
            if (p.isExpectedStartArrayToken()) {
                return ctxt.handleUnexpectedToken(type, p);
            }
            return typeDeserializer.deserializeTypedFromObject(p, ctxt);
        }
    }

    /**
     * How a file is read, whatever its format (issue #80, so that the command line and the editor read the same input the same
     * way):
     * <ul>
     *   <li>a key with no value ({@code elements:}, {@code settings:}) is a key that is not there, and so is an item with no
     *       value in a list ({@code elements: [null]}): the reader leaves the default alone, it does not call the builder
     *       with a null (which failed with a null pointer, or with {@code qualifiers cannot be null});</li>
     *   <li>a number is no kind, no layer and no operator: a whole number is not the position of a value of an enum;</li>
     *   <li>a list is no element: the array form of a type id ({@code [kind, {...}]}) is not read.</li>
     * </ul>
     */
    private static <M extends ObjectMapper> M reading(M mapper) {
        mapper.setDefaultSetterInfo(JsonSetter.Value.forValueNulls(Nulls.SKIP));
        for (val collection : List.<Class<?>>of(Set.class, List.class, Collection.class)) {
            mapper.configOverride(collection).setSetterInfo(JsonSetter.Value.forContentNulls(Nulls.SKIP));
        }
        mapper.enable(DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS);
        mapper.registerModule(NO_ARRAY_FOR_AN_ELEMENT);
        return mapper;
    }

    /**
     * Create a new {@link ObjectMapper} for the given {@link MapperFormat}.
     *
     * @param format the format of the mapper
     * @return the created {@link ObjectMapper}
     */
    public ObjectMapper create(MapperFormat format) {
        switch (format) {
            case YAML -> {
                return yamlMapper;
            }
            case TOML -> {
                return tomlMapper;
            }
            case JSON -> {
                return jsonMapper;
            }
            default -> throw new IllegalStateException("Unexpected value: " + format);
        }
    }

    /**
     * Create a new {@link ObjectMapper} with a lazy configuration for the given {@link MapperFormat}.
     *
     * @param format the format of the mapper
     * @return the created {@link ObjectMapper}
     */
    public ObjectMapper createLazy(MapperFormat format) {
        switch (format) {
            case YAML -> {
                return yamlMapperLazy;
            }
            case TOML -> {
                return tomlMapperLazy;
            }
            case JSON -> {
                return jsonMapperLazy;
            }
            default -> throw new IllegalStateException("Unexpected value: " + format);
        }
    }

    /**
     * Create a new {@link ObjectMapper} for the given {@link Path}.
     *
     * @param path the path to create the mapper for
     * @return the created {@link ObjectMapper}
     */
    public ObjectMapper create(Path path) {
        val format = MapperFormat.resolve(path).orElseThrow(() ->
            new ArchiCodeException("The path `%s` doesn't match a handled format.", path)
        );
        return create(format);
    }
}

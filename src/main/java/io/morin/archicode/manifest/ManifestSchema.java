package io.morin.archicode.manifest;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.introspect.BeanPropertyDefinition;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchemaGenerator;
import io.morin.archicode.resource.Identifier;
import io.morin.archicode.resource.Reference;
import io.morin.archicode.resource.Required;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Nesting;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Technology;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The schema of a manifest as {@code archicode query schemas manifest} prints it: the envelope ({@code header}, {@code content}),
 * and, for each kind of manifest, the schema of its content. Nothing in it is typed by hand: the keys, the required keys and the
 * enums come from the classes of {@link ManifestKind#getType()} through the JSON-Schema generator of Jackson, the nesting
 * from {@link Parent#elementType()} and {@link Nesting}, the id and the reference rules from {@link Identifier} and
 * {@link Reference}, and a key is refused when its class does not ignore unknown keys.
 * <p>
 * The dialect is the one of {@code query schemas workspace} (Jackson's, close to draft 3): {@code "required": true} on the
 * property, no {@code oneOf}. A content depends on {@code header.kind}, which that dialect cannot say, so the kinds are side by
 * side under {@code kinds}, and a nested element is a {@code $ref} to {@code #/nested/<kind>} (a union in the {@code type} of the
 * items of {@code elements}, as draft 3 has it). The envelope's {@code content} says where to look.
 */
@UtilityClass
public class ManifestSchema {

    private static final JsonNodeFactory NODES = JsonNodeFactory.instance;

    /**
     * Generate the schema.
     *
     * @param mapper the JSON mapper of the application (read the classes with)
     * @param writer the writer the schema is generated with
     * @return the schema, every object with its keys in alphabetical order
     */
    @SneakyThrows
    public ObjectNode generate(ObjectMapper mapper, ObjectWriter writer) {
        val generator = new JsonSchemaGenerator(writer);
        val root = (ObjectNode) mapper.readTree(writer.writeValueAsString(generator.generateSchema(Manifest.class)));
        refine(mapper, root, mapper.constructType(Manifest.class));
        root.put(
            "description",
            "A manifest is a file with a `header` and a `content`. The content is described by `kinds[header.kind].content`; " +
                "an element nested in `elements` by `nested[<kind>]`."
        );
        val content = (ObjectNode) root.at("/properties/content");
        content.removeAll();
        content.put("type", "object");
        content.put("required", true);
        content.put("description", "Depends on `header.kind`: the schema is `kinds[header.kind].content`.");

        val kinds = NODES.objectNode();
        val nested = NODES.objectNode();
        val applicationLayer = Application.builder().build();
        val technologyLayer = Technology.builder().build();
        for (val kind : ManifestKind.values()) {
            val type = kind.getType();
            val base = (ObjectNode) mapper.readTree(writer.writeValueAsString(generator.generateSchema(type)));
            inlineReferences(base, definitionsOf(base, new TreeMap<>()));
            val entry = NODES.objectNode();
            val element = Element.class.isAssignableFrom(type);
            if (element) {
                val instance = (Element) mapper.convertValue(Map.of("id", "x", "kind", kind.getSubTypeName()), type);
                val holds = Nesting.kindsHeldBy(instance);
                if (instance instanceof Parent<?>) {
                    val items = (ObjectNode) base.at("/properties/elements/items");
                    items.removeAll();
                    val union = NODES.arrayNode();
                    holds.forEach(h -> union.add(NODES.objectNode().put("$ref", "#/nested/" + h)));
                    items.set("type", union);
                }
                entry.set("holds", toArray(holds));
                val layer = kind.getCategory() == Application.class ? applicationLayer : technologyLayer;
                entry.put("layer", kind.getCategory() == Application.class ? "application" : "technology");
                entry.put("heldAtTheTop", Nesting.holdsAtTheTop(layer, instance));
            }
            refine(mapper, base, mapper.constructType(type));
            val nestedForm = base.deepCopy();
            entry.put("kind", kind.getSubTypeName());
            entry.set("content", base);
            kinds.set(kind.getId(), entry);
            if (element) {
                val kindProperty = NODES.objectNode();
                kindProperty.put("type", "string");
                kindProperty.set("enum", NODES.arrayNode().add(kind.getSubTypeName()));
                kindProperty.put("required", true);
                ((ObjectNode) nestedForm.get("properties")).set("kind", kindProperty);
                nested.set(kind.getSubTypeName(), nestedForm);
            }
        }
        root.set("kinds", kinds);
        root.set("nested", nested);
        return (ObjectNode) sorted(root);
    }

    /** Every object of the tree that has an {@code id} (the generator names what it describes), by that id. */
    private Map<String, ObjectNode> definitionsOf(JsonNode node, Map<String, ObjectNode> into) {
        if (node instanceof ObjectNode object) {
            if (object.has("id") && object.has("properties")) {
                into.putIfAbsent(object.get("id").asText(), object.deepCopy());
            }
            object.forEach(child -> definitionsOf(child, into));
        } else if (node instanceof ArrayNode array) {
            array.forEach(child -> definitionsOf(child, into));
        }
        return into;
    }

    /**
     * The generator describes a class once and points at it ({@code $ref} to its id) the next time it meets it; an author reads
     * each key where it is, so the description is put back in place of the pointer.
     */
    private void inlineReferences(JsonNode node, Map<String, ObjectNode> definitions) {
        if (node instanceof ObjectNode object) {
            for (val name : new ArrayList<String>(iterable(object.fieldNames()))) {
                val child = object.get(name);
                if (
                    child instanceof ObjectNode childObject &&
                    childObject.has("$ref") &&
                    !childObject.get("$ref").asText().startsWith("#")
                ) {
                    val definition = definitions.get(childObject.get("$ref").asText());
                    if (definition != null) {
                        object.set(name, definition.deepCopy());
                    }
                }
                inlineReferences(object.get(name), definitions);
            }
        } else if (node instanceof ArrayNode array) {
            array.forEach(child -> inlineReferences(child, definitions));
        }
    }

    private List<String> iterable(java.util.Iterator<String> names) {
        val out = new ArrayList<String>();
        names.forEachRemaining(out::add);
        return out;
    }

    private ArrayNode toArray(List<String> values) {
        val array = NODES.arrayNode();
        values.forEach(array::add);
        return array;
    }

    /**
     * Complete a generated schema from the class it describes: the marks of identifiers and references, and the keys that are
     * refused (every key a class does not have, unless it ignores unknown keys).
     */
    private void refine(ObjectMapper mapper, ObjectNode schema, JavaType type) {
        if (!"object".equals(schema.path("type").asText()) || !schema.has("properties")) {
            return;
        }
        val description = mapper.getSerializationConfig().introspect(type);
        val definitions = new TreeMap<String, BeanPropertyDefinition>();
        for (val definition : description.findProperties()) {
            definitions.put(definition.getName(), definition);
        }
        val ignores = type.getRawClass().getAnnotation(JsonIgnoreProperties.class);
        if (ignores == null || !ignores.ignoreUnknown()) {
            schema.put("additionalProperties", false);
        }
        val properties = (ObjectNode) schema.get("properties");
        properties.fields().forEachRemaining(property -> {
            val definition = definitions.get(property.getKey());
            if (definition == null || !(property.getValue() instanceof ObjectNode node)) {
                return;
            }
            val isArray = "array".equals(node.path("type").asText());
            val target = isArray && node.get("items") instanceof ObjectNode items ? items : node;
            val aliases = definition.findAliases();
            if (!aliases.isEmpty()) {
                // the other spellings of the key that the reader takes (`json_path` for `json-path`)
                val names = new ArrayList<String>();
                aliases.forEach(alias -> names.add(alias.getSimpleName()));
                names.sort(Comparator.naturalOrder());
                node.set("aliases", toArray(names));
            }
            val member = definition.getPrimaryMember();
            if (member != null) {
                if (member.hasAnnotation(Required.class)) {
                    node.put("required", true);
                }
                val identifier = member.getAnnotation(Identifier.class);
                if (identifier != null) {
                    mark(target, identifier.value().getPattern(), identifier.value().getDescription());
                }
                val reference = member.getAnnotation(Reference.class);
                if (reference != null) {
                    mark(target, reference.value().getPattern(), reference.value().getDescription());
                }
            }
            val propertyType = definition.getPrimaryType();
            if (
                propertyType.isEnumType() &&
                propertyType.getRawClass() != ManifestKind.class &&
                node.get("enum") instanceof ArrayNode values
            ) {
                val names = new ArrayList<String>();
                values.forEach(value -> names.add(value.asText()));
                names.sort(Comparator.naturalOrder());
                node.set("enum", toArray(names));
                node.put("description", "Read in any case: upper and lower case are the same value.");
            }
            val contentType =
                propertyType.isContainerType() && propertyType.getContentType() != null
                    ? propertyType.getContentType()
                    : propertyType;
            refine(mapper, target, contentType);
        });
    }

    private void mark(ObjectNode target, String pattern, String description) {
        if (pattern != null) {
            target.put("pattern", pattern);
        }
        target.put("description", description);
    }

    /** The same tree with the keys of every object in alphabetical order (arrays keep the order they have). */
    private JsonNode sorted(JsonNode node) {
        if (node instanceof ObjectNode object) {
            val names = new ArrayList<String>();
            object.fieldNames().forEachRemaining(names::add);
            names.sort(Comparator.naturalOrder());
            val out = NODES.objectNode();
            names.forEach(name -> out.set(name, sorted(object.get(name))));
            return out;
        }
        if (node instanceof ArrayNode array) {
            val out = NODES.arrayNode();
            array.forEach(item -> out.add(sorted(item)));
            return out;
        }
        return node;
    }
}

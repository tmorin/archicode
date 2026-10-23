package io.morin.archicode.doc;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.val;

/**
 * Checks a manifest against the schema {@code archicode query schemas manifest} prints. It reads the subset of the dialect the
 * generator emits (Jackson's, close to draft 3), and nothing else: {@code type} (a name, {@code any}, or a list of schemas, any
 * of which may match), {@code properties} with {@code "required": true}, {@code additionalProperties} (false, or the schema of
 * the values of a map), {@code items}, {@code enum}, {@code pattern}, {@code $ref} to a pointer of the document ({@code #/nested/x}),
 * and {@code aliases}. It reads a value the way the loader does: a scalar is a text whatever its type, an empty value is
 * absent, an enum is read in any case.
 */
final class SchemaChecker {

    private final JsonNode root;

    SchemaChecker(JsonNode root) {
        this.root = root;
    }

    /**
     * The problems of a manifest, none when it conforms.
     *
     * @param manifest the document of the file
     * @return the problems, each with the path of the value
     */
    List<String> problems(JsonNode manifest) {
        val out = new ArrayList<String>();
        if (manifest == null || manifest.isNull() || manifest.isMissingNode()) {
            out.add("the document is empty");
            return out;
        }
        check(root, manifest, "", out);
        if (!out.isEmpty() || !manifest.isObject()) {
            return out;
        }
        val kind = manifest.path("header").path("kind").asText("");
        val kinds = root.get("kinds");
        JsonNode entry = null;
        for (val name : (Iterable<String>) kinds::fieldNames) {
            if (name.equalsIgnoreCase(kind.trim())) {
                entry = kinds.get(name);
            }
        }
        if (entry == null) {
            out.add("`header.kind` " + kind + " is none of the kinds");
            return out;
        }
        check(entry.get("content"), manifest.get("content"), "content", out);
        return out;
    }

    private void check(JsonNode schema, JsonNode value, String path, List<String> out) {
        if (value == null || value.isNull() || value.isMissingNode()) {
            return;
        }
        if (schema.has("$ref")) {
            check(resolve(schema.get("$ref").asText()), value, path, out);
            return;
        }
        val type = schema.get("type");
        if (type != null && type.isArray()) {
            for (val alternative : type) {
                val attempt = new ArrayList<String>();
                check(alternative, value, path, attempt);
                if (attempt.isEmpty()) {
                    return;
                }
            }
            out.add(at(path) + "matches none of the " + type.size() + " forms it may take");
            return;
        }
        val name = type == null ? "any" : type.asText();
        switch (name) {
            case "any" -> {
            }
            case "string" -> {
                if (value.isContainerNode()) {
                    out.add(at(path) + "is not a text");
                    return;
                }
                val text = value.asText();
                if (schema.has("enum") && !contains(schema.get("enum"), text)) {
                    out.add(at(path) + "`" + text + "` is none of " + schema.get("enum"));
                }
                if (schema.has("pattern") && !Pattern.compile(schema.get("pattern").asText()).matcher(text).find()) {
                    out.add(at(path) + "`" + text + "` does not match " + schema.get("pattern").asText());
                }
            }
            case "integer", "number" -> {
                if (
                    value.isContainerNode() ||
                    value.isBoolean() ||
                    (value.isTextual() && !value.asText().strip().matches("[-+]?\\d+"))
                ) {
                    out.add(at(path) + "is not a number");
                }
            }
            case "boolean" -> {
                if (
                    value.isContainerNode() ||
                    (!value.isBoolean() && !value.isIntegralNumber() && !value.asText().matches("(?i)true|false|"))
                ) {
                    out.add(at(path) + "is not a boolean");
                }
            }
            case "array" -> {
                if (!value.isArray()) {
                    out.add(at(path) + "is not a list");
                    return;
                }
                if (schema.has("items")) {
                    for (int i = 0; i < value.size(); i++) {
                        check(schema.get("items"), value.get(i), path + "[" + i + "]", out);
                    }
                }
            }
            case "object" -> {
                if (!value.isObject()) {
                    out.add(at(path) + "is not an object");
                    return;
                }
                val properties = schema.path("properties");
                for (val key : (Iterable<String>) value::fieldNames) {
                    val property = canonical(properties, key);
                    val child = path.isEmpty() ? key : path + "." + key;
                    if (property != null) {
                        check(properties.get(property), value.get(key), child, out);
                    } else if (schema.path("additionalProperties").isObject()) {
                        check(schema.get("additionalProperties"), value.get(key), child, out);
                    } else if (
                        schema.path("additionalProperties").isBoolean() &&
                        !schema.get("additionalProperties").asBoolean()
                    ) {
                        out.add(at(child) + "is an unknown key");
                    }
                }
                for (val key : (Iterable<String>) properties::fieldNames) {
                    if (properties.get(key).path("required").asBoolean(false) && !present(value, properties, key)) {
                        out.add(at(path.isEmpty() ? key : path + "." + key) + "is required");
                    }
                }
            }
            default -> out.add(at(path) + "has a type this checker does not read: " + name);
        }
    }

    /** The key of the schema a key of the file is: itself, or the property that lists it as an alias. */
    private static String canonical(JsonNode properties, String key) {
        if (properties.has(key)) {
            return key;
        }
        for (val name : (Iterable<String>) properties::fieldNames) {
            for (val alias : properties.get(name).path("aliases")) {
                if (alias.asText().equals(key)) {
                    return name;
                }
            }
        }
        return null;
    }

    private static boolean present(JsonNode value, JsonNode properties, String key) {
        if (isSet(value.get(key))) {
            return true;
        }
        for (val alias : properties.get(key).path("aliases")) {
            if (isSet(value.get(alias.asText()))) {
                return true;
            }
        }
        return false;
    }

    private static boolean isSet(JsonNode node) {
        return node != null && !node.isNull() && !(node.isTextual() && node.asText().isEmpty());
    }

    private JsonNode resolve(String reference) {
        val node = root.at(reference.substring(1));
        if (node.isMissingNode()) {
            throw new IllegalStateException("the schema points at " + reference + ", which is not in it");
        }
        return node;
    }

    private static boolean contains(JsonNode values, String text) {
        for (val value : values) {
            if (value.asText().toLowerCase(Locale.ROOT).equals(text.strip().toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static String at(String path) {
        return path.isEmpty() ? "the document " : "`" + path + "` ";
    }
}

package io.morin.archicode.cli;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.ManifestSchema;
import io.morin.archicode.resource.Identifier;
import io.morin.archicode.resource.Reference;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import picocli.CommandLine;

/**
 * The text {@code archicode guide} prints (wave 022, run 0159, issue #144): the guide for an agent that has only the binary.
 *
 * <p>Two sections are generated, so that nothing the code can say is typed by hand (decision T2): the manifests (the kinds, their
 * keys, required keys, enums and nesting, from {@link ManifestSchema}, which is derived from the classes) and the commands (the
 * Picocli spec of the application: every command and every option). The rest is the resource {@code guide/guide.md}: the
 * conventions an agent cannot guess, whose examples are files that the tests load and run. The version of the build is the first
 * line. Nothing is read from the workspace, the file system or the network, so the text is the same from any folder, run after
 * run.
 */
@ApplicationScoped
public class Guide {

    static final String RESOURCE = "/guide/guide.md";
    static final String KINDS = "{{kinds}}";
    static final String COMMANDS = "{{commands}}";

    /** The options every command has: they are said once, above the list. */
    private static final Set<String> EVERYWHERE = Set.of("-h", "-w");

    private static final Pattern FIRST_SENTENCE = Pattern.compile("^(.*?[.!?])(\\s|$)", Pattern.DOTALL);
    /** The longest a line of the command list is: the rest is in the help of the command. */
    private static final int LIMIT = 220;
    private static final String ARCHICODE_PREFIX = "archicode.morin.io/";

    @ConfigProperty(name = "quarkus.application.version")
    String version;

    @Inject
    MapperFactory mapperFactory;

    /**
     * @param root the specification of the top command
     * @return the guide, ending with one line feed
     */
    public String render(CommandLine.Model.CommandSpec root) {
        val text = resource().replace(KINDS, kinds().strip()).replace(COMMANDS, commands(root).strip());
        return "archicode guide " + version + "\n\n" + text.strip() + "\n";
    }

    @SneakyThrows
    private static String resource() {
        try (InputStream in = Guide.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IOException("the resource " + RESOURCE + " is not in the application");
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    // ---------------------------------------------------------------------------------------------------- commands

    String commands(CommandLine.Model.CommandSpec root) {
        val out = new StringBuilder();
        walk(root, "archicode", out);
        return out.toString();
    }

    private static void walk(CommandLine.Model.CommandSpec spec, String path, StringBuilder out) {
        out.append("- `").append(path).append("`");
        for (val parameter : spec.positionalParameters()) {
            out.append(" `").append(parameter.paramLabel()).append("`");
        }
        out.append(": ").append(firstSentence(spec.usageMessage().description())).append('\n');
        for (val option : spec.options()) {
            if (option.names().length > 0 && EVERYWHERE.contains(option.names()[0])) {
                continue;
            }
            out.append("  - `")
                .append(optionSignature(option))
                .append("`: ")
                .append(firstSentence(option.description()))
                .append('\n');
        }
        for (val entry : new TreeMap<>(spec.subcommands()).entrySet()) {
            val sub = entry.getValue();
            if (sub.getCommandSpec().usageMessage().hidden()) {
                continue;
            }
            walk(sub.getCommandSpec(), path + " " + entry.getKey(), out);
        }
    }

    /** The names of an option as one writes them, with the label of its value: {@code -i, --view[=VIEW_ID...]}. */
    static String optionSignature(CommandLine.Model.OptionSpec option) {
        val names = String.join(", ", option.names());
        if (option.arity().max() == 0) {
            return names;
        }
        val label = option.paramLabel().replaceAll("^<|>$", "");
        return names + (option.arity().min() == 0 ? "[=" + label + "]" : "=" + label);
    }

    private static String firstSentence(String[] description) {
        val text = String.join(" ", description).replaceAll("\\s+", " ").strip();
        val matcher = FIRST_SENTENCE.matcher(text);
        val sentence = matcher.find() ? matcher.group(1) : text;
        if (sentence.length() <= LIMIT) {
            return sentence;
        }
        return sentence.substring(0, sentence.lastIndexOf(' ', LIMIT - 4)) + " ...";
    }

    // ----------------------------------------------------------------------------------------------------- kinds

    String kinds() {
        val mapper = mapperFactory.create(MapperFormat.JSON);
        val schema = (JsonNode) ManifestSchema.generate(mapper, GetSchemasQuery.sortedWriter(mapperFactory));
        val out = new StringBuilder();
        val seen = new HashSet<String>();

        out.append("Value types: ");
        val types = new ArrayList<String>();
        types.add("`element-id`: " + Identifier.Of.ELEMENT.getDescription());
        types.add("`plateau-id`: " + Identifier.Of.PLATEAU.getDescription());
        types.add("`reference`: " + Reference.To.ELEMENT.getDescription());
        types.add("`view-id`: " + Reference.To.VIEW.getDescription());
        out.append(String.join(" ", types)).append(" An enum is read in any case. `*` marks a required key.\n\n");

        out.append("**header** (every manifest): `kind` is the id of a kind below.\n");
        describe(schema.path("properties").path("header"), 0, out, seen, true);
        out.append('\n');

        val kinds = new TreeMap<String, JsonNode>();
        schema
            .path("kinds")
            .fields()
            .forEachRemaining(e -> kinds.put(e.getKey(), e.getValue()));
        for (val entry : kinds.entrySet()) {
            val kind = entry.getValue();
            out.append("**").append(entry.getKey().substring(ARCHICODE_PREFIX.length())).append("**");
            out.append(" `header.kind: ").append(entry.getKey()).append('`');
            if (kind.has("layer")) {
                out.append(", ").append(kind.path("layer").asText()).append(" layer");
                out.append(
                    kind.path("heldAtTheTop").asBoolean()
                        ? ", may be the top of the layer"
                        : ", never the top of the layer"
                );
                val holds = strings(kind.path("holds"));
                out.append(holds.isEmpty() ? ", holds nothing" : ", holds " + String.join(", ", holds));
            }
            out.append('\n');
            describe(kind.path("content"), 0, out, seen, false);
            out.append('\n');
        }
        return out.toString();
    }

    /** One line per key of an object, nested objects indented under it; an object met before is not described again. */
    private static void describe(JsonNode object, int depth, StringBuilder out, Set<String> seen, boolean header) {
        val properties = new TreeMap<String, JsonNode>();
        object
            .path("properties")
            .fields()
            .forEachRemaining(e -> properties.put(e.getKey(), e.getValue()));
        for (val entry : properties.entrySet()) {
            val key = entry.getKey();
            val node = entry.getValue();
            out.append("  ".repeat(depth)).append("- `").append(key).append('`');
            if (node.path("required").asBoolean()) {
                out.append('*');
            }
            val aliases = strings(node.path("aliases"));
            if (!aliases.isEmpty()) {
                out.append(" (also `").append(String.join("`, `", aliases)).append("`)");
            }
            out.append(": ").append(typeOf(node, header && key.equals("kind")));
            val inner = objectOf(node);
            if (inner != null && inner.has("properties")) {
                val id = inner.path("id").asText("");
                if (!id.isEmpty() && !seen.add(id)) {
                    out.append(" (as above)\n");
                    continue;
                }
                out.append('\n');
                describe(inner, depth + 1, out, seen, false);
            } else {
                out.append('\n');
            }
        }
    }

    /** The object a key holds, or each item of the array it holds. */
    private static JsonNode objectOf(JsonNode node) {
        if ("array".equals(node.path("type").asText()) && node.path("items").has("properties")) {
            return node.get("items");
        }
        return "object".equals(node.path("type").asText()) && node.has("properties") ? node : null;
    }

    private static String typeOf(JsonNode node, boolean skipEnum) {
        val named = named(node);
        if (named != null) {
            return named;
        }
        if (node.has("enum")) {
            return skipEnum ? "string" : "one of " + String.join(", ", strings(node.get("enum")));
        }
        val type = node.path("type");
        if (type.isArray()) {
            return "any";
        }
        switch (type.asText("any")) {
            case "array" -> {
                val items = node.path("items");
                if (items.path("type").isArray()) {
                    val kinds = new ArrayList<String>();
                    for (val ref : items.get("type")) {
                        kinds.add(ref.path("$ref").asText().replaceAll("^#/nested/", ""));
                    }
                    return (
                        "array of elements, each with `kind` (one of " +
                        String.join(", ", kinds) +
                        ") and the keys of that kind"
                    );
                }
                val of = typeOf(items, false);
                return "array of " + (items.has("properties") ? "objects" : of);
            }
            case "object" -> {
                if (node.has("properties")) {
                    return "object";
                }
                val values = node.path("additionalProperties");
                return values.isObject() ? "map of " + typeOf(values, false) : "object";
            }
            default -> {
                return type.asText("any");
            }
        }
    }

    /** The name of a value type the code defines, found by the description its annotation gives the schema. */
    private static String named(JsonNode node) {
        val description = node.path("description").asText("");
        for (val of : Identifier.Of.values()) {
            if (description.equals(of.getDescription())) {
                return of == Identifier.Of.ELEMENT ? "element-id" : "plateau-id";
            }
        }
        val names = Map.of(
            Reference.To.ELEMENT,
            "reference",
            Reference.To.PLATEAU,
            "plateau-id",
            Reference.To.VIEW,
            "view-id"
        );
        for (val to : Reference.To.values()) {
            if (description.equals(to.getDescription())) {
                return names.get(to);
            }
        }
        return null;
    }

    private static List<String> strings(JsonNode list) {
        val out = new ArrayList<String>();
        for (Iterator<JsonNode> it = list.elements(); it.hasNext(); ) {
            val text = it.next().asText();
            out.add(text);
        }
        return out;
    }
}

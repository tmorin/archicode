package io.morin.archicode.importer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

/**
 * Imports the JSON export of a Structurizr workspace into a folder: refuses what is not a JSON file, reads, maps, serializes
 * the manifests and hands the bytes to {@link ImportFiles}. The warnings (what the import leaves out, the ids it rewrote) are
 * queued only once the folder is in place, so a failed write prints no list of what was dropped. It knows no command line.
 */
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class StructurizrImportService {

    /** The workspace file the import writes. */
    static final String WORKSPACE_FILE = ".archicode.yaml";

    MapperFactory mapperFactory;
    Warnings warnings;

    /**
     * What an import wrote.
     *
     * @param elements      the number of elements written
     * @param relationships the number of relationships written
     */
    public record Imported(int elements, int relationships) {}

    /**
     * Import a workspace.
     *
     * @param input  the JSON export
     * @param output the folder to write, absent or empty
     * @param files  the writer
     * @return what was written
     * @throws ArchiCodeException with one sentence, nothing is written
     */
    public Imported importWorkspace(Path input, Path output, ImportFiles files) {
        val file = input.toString();
        val name = input.getFileName() == null ? file : input.getFileName().toString();
        if (!name.toLowerCase(Locale.ROOT).endsWith(".json")) {
            throw new ArchiCodeException(
                "%s is not a JSON export of a Structurizr workspace: only the JSON export is read",
                file
            );
        }
        val model = StructurizrReader.read(parse(input, file), file);
        val mapped = StructurizrMapper.map(model, name);
        val written = new LinkedHashMap<String, byte[]>();
        val yaml = mapperFactory.forWriting(MapperFormat.YAML);
        written.put(WORKSPACE_FILE, serialize(yaml, mapped.workspace()));
        for (val planned : mapped.manifests()) {
            written.put(planned.path(), serialize(yaml, planned.manifest()));
        }
        ImportFiles.commit(files, output, written);
        warnings.warnAll(report(model.dropped(), mapped));
        return new Imported(mapped.elements(), mapped.relationships());
    }

    private static JsonNode parse(Path input, String file) {
        if (Files.isDirectory(input)) {
            throw new ArchiCodeException("%s is a folder: import reads a JSON file", file);
        }
        final byte[] bytes;
        try {
            bytes = Files.readAllBytes(input);
        } catch (IOException e) {
            throw new ArchiCodeException("cannot read %s: %s", file, reason(e));
        }
        try {
            return new ObjectMapper().readTree(bytes);
        } catch (IOException e) {
            throw new ArchiCodeException("%s is not JSON: %s", file, reason(e));
        }
    }

    private static String reason(IOException e) {
        val message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        val line = message.indexOf('\n');
        return line < 0 ? message : message.substring(0, line);
    }

    private static byte[] serialize(ObjectMapper yaml, Object value) {
        try {
            return yaml.writeValueAsString(value).getBytes(StandardCharsets.UTF_8);
        } catch (JsonProcessingException e) {
            throw new ArchiCodeException("the import cannot write the workspace: %s", reason(e));
        }
    }

    /** The warnings, in the order of the report: the parts left out, then the relationships, then the rewritten ids. */
    private static List<String> report(StructurizrModel.Dropped dropped, StructurizrMapper.Mapped mapped) {
        val lines = new ArrayList<String>();
        add(lines, "views: %d dropped", dropped.views());
        add(lines, "deployment nodes: %d dropped", dropped.deploymentNodes());
        add(lines, "styles: %d dropped", dropped.styles());
        add(lines, "documentation: %d dropped", dropped.documentation());
        add(lines, "properties: %d dropped", dropped.properties());
        add(lines, "perspectives: %d dropped", dropped.perspectives());
        add(lines, "custom elements: %d dropped", dropped.customElements());
        add(lines, "configuration: %d dropped", dropped.configuration());
        add(lines, "implied relationships: %d skipped", dropped.impliedRelationships());
        add(lines, "relationships to elements that are not imported: %d dropped", mapped.droppedRelationships());
        lines.addAll(mapped.rewrites());
        return lines;
    }

    private static void add(List<String> lines, String format, int count) {
        if (count > 0) {
            lines.add(String.format(format, count));
        }
    }
}

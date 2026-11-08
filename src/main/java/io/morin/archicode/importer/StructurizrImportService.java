package io.morin.archicode.importer;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import jakarta.enterprise.context.ApplicationScoped;
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
        val model = StructurizrReader.read(ImportSupport.parse(input, file), file);
        val mapped = StructurizrMapper.map(model, name);
        val written = new LinkedHashMap<String, byte[]>();
        val yaml = mapperFactory.forWriting(MapperFormat.YAML);
        written.put(ImportSupport.WORKSPACE_FILE, ImportSupport.serialize(yaml, mapped.workspace()));
        for (val planned : mapped.manifests()) {
            written.put(planned.path(), ImportSupport.serialize(yaml, planned.manifest()));
        }
        ImportFiles.commit(files, output, written);
        warnings.warnAll(report(model.dropped(), mapped));
        return new Imported(mapped.elements(), mapped.relationships());
    }

    /** The warnings, in the order of the report: the parts left out, then the relationships, then the rewritten ids. */
    private static List<String> report(StructurizrModel.Dropped dropped, StructurizrMapper.Mapped mapped) {
        val lines = new ArrayList<String>();
        ImportSupport.add(lines, "views: %d dropped", dropped.views());
        ImportSupport.add(lines, "deployment nodes: %d dropped", dropped.deploymentNodes());
        ImportSupport.add(lines, "styles: %d dropped", dropped.styles());
        ImportSupport.add(lines, "documentation: %d dropped", dropped.documentation());
        ImportSupport.add(lines, "properties: %d dropped", dropped.properties());
        ImportSupport.add(lines, "perspectives: %d dropped", dropped.perspectives());
        ImportSupport.add(lines, "custom elements: %d dropped", dropped.customElements());
        ImportSupport.add(lines, "configuration: %d dropped", dropped.configuration());
        ImportSupport.add(lines, "implied relationships: %d skipped", dropped.impliedRelationships());
        ImportSupport.add(
            lines,
            "relationships to elements that are not imported: %d dropped",
            mapped.droppedRelationships()
        );
        lines.addAll(mapped.rewrites());
        return lines;
    }
}

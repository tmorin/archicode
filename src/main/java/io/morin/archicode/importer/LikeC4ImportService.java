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
 * Imports the JSON export of a LikeC4 model into a folder: refuses what is not a JSON file, reads, maps, serializes the
 * manifests and hands the bytes to {@link ImportFiles}. The warnings (what the import leaves out, the ids it rewrote) are
 * queued only once the folder is in place, so a failed write prints no list of what was dropped. It knows no command line.
 */
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class LikeC4ImportService {

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
     * Import a model.
     *
     * @param input   the JSON export
     * @param output  the folder to write, absent or empty
     * @param maps    the values of the {@code --map} options, each {@code <kind>=<kind>}; may be empty
     * @param project the project to read when the file holds several, or null
     * @param files   the writer
     * @return what was written
     * @throws ArchiCodeException with one sentence, nothing is written
     */
    public Imported importModel(Path input, Path output, List<String> maps, String project, ImportFiles files) {
        val file = input.toString();
        val name = input.getFileName() == null ? file : input.getFileName().toString();
        val lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".c4") || lower.endsWith(".likec4")) {
            throw new ArchiCodeException(
                "%s is a LikeC4 source file: export it to JSON first (likec4 export json --skip-layout -o <model.json> <folder>)",
                file
            );
        }
        if (!lower.endsWith(".json")) {
            throw new ArchiCodeException(
                "%s is not a JSON export of a LikeC4 model: only the JSON export is read",
                file
            );
        }
        val model = LikeC4Reader.read(ImportSupport.parse(input, file), file, project);
        val mapped = LikeC4Mapper.map(model, maps == null ? List.of() : maps, name);
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

    /** The warnings, in the order of the report: the parts left out, the count of dropped elements, each of them, the rewrites. */
    private static List<String> report(LikeC4Model.Dropped dropped, LikeC4Mapper.Mapped mapped) {
        val lines = new ArrayList<String>();
        ImportSupport.add(lines, "views: %d dropped", dropped.views());
        ImportSupport.add(lines, "deployment elements: %d dropped", dropped.deploymentElements());
        ImportSupport.add(lines, "deployment relationships: %d dropped", dropped.deploymentRelationships());
        ImportSupport.add(lines, "styles: %d dropped", dropped.styles());
        ImportSupport.add(lines, "metadata: %d dropped", dropped.metadata());
        ImportSupport.add(lines, "links: %d dropped", dropped.links());
        ImportSupport.add(lines, "navigateTo: %d dropped", dropped.navigateTo());
        ImportSupport.add(lines, "notation: %d dropped", dropped.notation());
        ImportSupport.add(lines, "globals: %d dropped", dropped.globals());
        ImportSupport.add(lines, "imports: %d dropped", dropped.imports());
        ImportSupport.add(lines, "diffs: %d dropped", dropped.diffs());
        ImportSupport.add(lines, "manual layouts: %d dropped", dropped.manualLayouts());
        ImportSupport.add(lines, "bidirectional relationships: %d written in one direction", mapped.bidirectional());
        ImportSupport.add(
            lines,
            "relationships to elements that are not imported: %d dropped",
            mapped.droppedRelationships()
        );
        ImportSupport.add(lines, "dropped elements: %d", mapped.droppedElements().size());
        lines.addAll(mapped.droppedElements());
        lines.addAll(mapped.rewrites());
        return lines;
    }
}

package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.workspace.Workspace;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.val;

/**
 * Asks the viewpoint kernel what changed from one plateau to another: the CLI and the editor call the very same function,
 * so they list the same new, changed and removed things.
 *
 * <p>Each plateau is a {@link Workspace} loaded on its own (see {@code WorkspaceFactory.create(path, viewsDir, plateauId)}).
 * The elements go in with what a comparison reads: kind, name, description, qualifiers and tags, the relationships, and
 * for the technology layer the applications and the {@code uses}.
 */
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class PlateauComparer {

    @NonNull
    ObjectMapper objectMapper;

    /**
     * @param base the plateau to compare with (the earlier one)
     * @param target the plateau that is compared
     * @return the union, the table of changes and the counts
     * @throws io.morin.archicode.ArchiCodeException when the kernel refuses a plateau (a dangling reference, a reference
     *                                               declared twice) or speaks another contract version
     */
    @SneakyThrows
    public Comparison compare(@NonNull Workspace base, @NonNull Workspace target) {
        val input = objectMapper.createObjectNode();
        input.set("base", side(base));
        input.set("target", side(target));
        val answer = ViewpointKernel.getInstance().compare(objectMapper.writeValueAsString(input));
        return Comparison.of(objectMapper.readTree(answer));
    }

    private com.fasterxml.jackson.databind.node.ObjectNode side(Workspace workspace) {
        val side = objectMapper.createObjectNode();
        side.set("application", KernelGraph.of(workspace.appIndex, objectMapper, true));
        side.set("technology", KernelGraph.of(workspace.techIndex, objectMapper, true));
        return side;
    }
}

package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.workspace.Workspace;
import java.util.HashMap;
import java.util.List;
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
        val baseSide = side(base);
        val targetSide = side(target);
        if (target.getPlateauTree() != null) {
            dropInheritedReplaces(baseSide, targetSide);
        }
        input.set("base", baseSide);
        input.set("target", targetSide);
        val answer = ViewpointKernel.getInstance().compare(objectMapper.writeValueAsString(input));
        return Comparison.of(objectMapper.readTree(answer)).between(base.getPlateau(), target.getPlateau());
    }

    /**
     * A layered plateau holds, with its own elements, the ones it inherits from the plateaus above it, and an inherited element
     * keeps the {@code replaces} of the layer that declared it. Compared with a plateau that has that layer, the entry says
     * nothing the comparison does not already know (the element it replaced went in the layer above), and the kernel would
     * warn, for every one, that it names nothing of the base. So the {@code replaces} that the target and the base write
     * the same for the same element are left out of the target: what is left is what the target alone says.
     */
    private static void dropInheritedReplaces(ObjectNode base, ObjectNode target) {
        for (val layer : List.of("application", "technology")) {
            val known = new HashMap<String, JsonNode>();
            base.path(layer).forEach(e -> {
                if (e.has("replaces")) {
                    known.put(e.path("reference").asText(), e.get("replaces"));
                }
            });
            target.path(layer).forEach(e -> {
                if (e.has("replaces") && e.get("replaces").equals(known.get(e.path("reference").asText()))) {
                    ((ObjectNode) e).remove("replaces");
                }
            });
        }
    }

    private ObjectNode side(Workspace workspace) {
        val side = objectMapper.createObjectNode();
        side.set("application", KernelGraph.of(workspace.appIndex, objectMapper, true));
        side.set("technology", KernelGraph.of(workspace.techIndex, objectMapper, true));
        return side;
    }
}

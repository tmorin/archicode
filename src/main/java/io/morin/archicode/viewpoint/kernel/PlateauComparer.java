package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.PlateauStep;
import io.morin.archicode.workspace.Workspace;
import java.util.TreeMap;
import java.util.function.Predicate;
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
     * Compares two plateaus; the kernel is told whether they are on one chain by the tree of plateaus they were loaded from
     * (see {@link #onOneChain}).
     *
     * @param base the plateau to compare with (the earlier one)
     * @param target the plateau that is compared
     * @return the union, the table of changes and the counts
     * @throws io.morin.archicode.ArchiCodeException when the kernel refuses a plateau (a dangling reference, a reference
     *                                               declared twice) or speaks another contract version
     */
    public Comparison compare(@NonNull Workspace base, @NonNull Workspace target) {
        return compare(base, target, onOneChain(base, target));
    }

    /**
     * Whether one of two plateaus is the past of the other (an ancestor in the tree of plateaus), which only the tree knows and
     * the kernel is told: between siblings, two alternatives, the candidates of {@code replaces} leave out the reason that the
     * two are the only ones of their kind under the same parent (issue #70). A workspace that has no tree (no plateau is
     * layered) has no sibling, so a pair of them is a chain.
     *
     * @param base the plateau to compare with
     * @param target the plateau that is compared
     * @return true when they are on one chain
     */
    public static boolean onOneChain(@NonNull Workspace base, @NonNull Workspace target) {
        val tree = target.getPlateauTree() != null ? target.getPlateauTree() : base.getPlateauTree();
        if (tree == null || base.getPlateau() == null || target.getPlateau() == null) {
            return true;
        }
        return tree.onOneChain(base.getPlateau().getId(), target.getPlateau().getId());
    }

    /**
     * @param base the plateau to compare with
     * @param target the plateau that is compared
     * @param onOneChain whether one of the two is the past of the other: sent to the kernel as it is
     * @return the union, the table of changes and the counts
     * @throws io.morin.archicode.ArchiCodeException when the kernel refuses a plateau (a dangling reference, a reference
     *                                               declared twice) or speaks another contract version
     */
    @SneakyThrows
    public Comparison compare(@NonNull Workspace base, @NonNull Workspace target, boolean onOneChain) {
        val input = objectMapper.createObjectNode();
        input.set("base", side(base, null));
        input.set("target", side(target, base));
        input.put("on_one_chain", onOneChain);
        val chain = chain(base, target);
        if (chain != null) {
            input.set("chain", chain);
        }
        val answer = ViewpointKernel.getInstance().compare(objectMapper.writeValueAsString(input));
        return Comparison.of(objectMapper.readTree(answer)).between(base.getPlateau(), target.getPlateau());
    }

    /**
     * The plateaus the target stands on, for the kernel to compose the {@code replaces} of the layers between the base and the
     * target (wave 017, issue #89): each layer writes {@code replaces} relative to the plateau it overrides, so a move made in two
     * steps names, for a plateau two steps up, an element the base does not have. The chain runs from the base (or, for two
     * siblings, from the plateau they have in common) to the plateau the target overrides, oldest first; each plateau gives its
     * references and the {@code replaces} of its elements as their layer wrote them. Null when there is nothing to compose: the
     * workspace has no layers, the target is the base or its past, or it is one layer above the plateau it is compared with.
     */
    private ArrayNode chain(Workspace base, Workspace target) {
        val tree = target.getPlateauTree();
        if (tree == null || base.getPlateau() == null || target.getPlateau() == null) {
            return null;
        }
        val nodes = tree.standsOn(target.getPlateau().getId(), base.getPlateau().getId());
        if (nodes.size() < 2) {
            return null;
        }
        val steps = new TreeMap<String, PlateauStep>();
        target.getSteps().forEach(step -> steps.put(step.plateau(), step));
        val chain = objectMapper.createArrayNode();
        for (val node : nodes) {
            val step = steps.get(node.id());
            if (step == null) {
                return null;
            }
            val plateau = chain.addObject();
            plateau.set("application", stepLayer(step.application()));
            plateau.set("technology", stepLayer(step.technology()));
        }
        return chain;
    }

    /** What the kernel reads of the elements of a plateau of the chain: the references and the {@code replaces} as written. */
    private ArrayNode stepLayer(ElementIndex index) {
        val elements = objectMapper.createArrayNode();
        new TreeMap<>(index.elementByReferenceIndex).forEach((reference, element) -> {
            val node = elements.addObject();
            node.put("reference", reference);
            val written = KernelGraph.replacesAsWritten(element);
            if (written != null) {
                node.set("replaces", written);
            }
        });
        return elements;
    }

    /**
     * The elements of a plateau as the kernel takes them. A layered plateau holds, with its own elements, the ones it inherits
     * from the plateaus above it, and an inherited element keeps the {@code replaces} of the layer that declared it. Compared
     * with a plateau that holds the same element saying the same, the entry says nothing the comparison does not already know
     * (the element it replaced went in the layer above), and the kernel would warn, for every one, that it names nothing of
     * the base. So the {@code replaces} of the target are given unless the base says exactly the same for the same element:
     * what is left is what the target alone says. Whether an entry is news depends on the plateau it is compared with (the
     * root has not got the layer that wrote it, a plateau that moved the element again has lost it), which is why the load
     * of one plateau cannot take it out, and why it is decided here, once, for every pair.
     *
     * @param workspace the plateau
     * @param base      the plateau it is compared with, or null for the base itself, whose {@code replaces} are all given
     */
    private ObjectNode side(Workspace workspace, Workspace base) {
        val side = objectMapper.createObjectNode();
        side.set(
            "application",
            KernelGraph.of(
                workspace.appIndex,
                objectMapper,
                true,
                carries(workspace.appIndex, base == null ? null : base.appIndex)
            )
        );
        side.set(
            "technology",
            KernelGraph.of(
                workspace.techIndex,
                objectMapper,
                true,
                carries(workspace.techIndex, base == null ? null : base.techIndex)
            )
        );
        return side;
    }

    /** Whether the {@code replaces} of an element of {@code index} are given: not when the base says exactly the same. */
    private static Predicate<String> carries(ElementIndex index, ElementIndex base) {
        if (base == null) {
            return reference -> true;
        }
        return reference -> {
            val known = base.searchElement(reference).map(KernelGraph::replacesAsWritten).orElse(null);
            return (
                known == null || !known.equals(KernelGraph.replacesAsWritten(index.getElementByReference(reference)))
            );
        };
    }
}

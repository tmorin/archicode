package io.morin.archicode.resource.plateau;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.morin.archicode.resource.Identifier;
import io.morin.archicode.resource.Reference;
import io.morin.archicode.resource.Required;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;
import lombok.val;

/**
 * A plateau as the manifest of kind {@code archicode.morin.io/plateau} writes it: the architecture at a point of its life,
 * as a layer over the plateau it overrides. The manifests whose header says {@code plateau: <id>} are added to the graph of
 * the parent, then the {@link #getPatches() patches} change that graph, in order. The manifest is optional: a plateau exists
 * as soon as a header names it, and the manifest gives it a name, a horizon, a parent and patches
 * (see {@link PlateauTree}).
 */
@Value
@Builder(toBuilder = true)
@Jacksonized
@JsonIgnoreProperties("kind")
@ToString(onlyExplicitlyIncluded = true)
public class Plateau {

    /** The id of the root of every tree of plateaus: the plateau of a manifest that names none. */
    public static final String BASELINE = "baseline";

    /** The identifier: what {@code plateau:} in a header, {@code override} and {@code --plateau} name. */
    @NonNull
    @Required
    @ToString.Include
    @Identifier(Identifier.Of.PLATEAU)
    String id;

    /** The human name of the plateau. */
    String name;

    /** A free label (a date, a quarter...) that no tool interprets. */
    String horizon;

    /** The one plateau this one is a layer over: {@code baseline} when absent. */
    @ToString.Include
    @Reference(Reference.To.PLATEAU)
    String override;

    /** The changes this plateau makes to the graph of the plateau it overrides, in the order they are applied. */
    List<Patch> patches;

    /**
     * The patches, in order; none when the manifest writes none. An item that is {@code null} is no patch.
     *
     * @return the patches (a list that is never null)
     */
    public List<Patch> getPatches() {
        return patches == null ? List.of() : patches.stream().filter(Objects::nonNull).toList();
    }

    /**
     * What is wrong with the shape of the patches, beyond the keys and the values the reader checks: a patch says what it
     * selects with a {@code target} or a {@code json-path}, one of them. The rest of what a combination of keys means is the
     * kernel's to say, with the plateau and the rank, when the layer is built. The editor says the same sentences
     * ({@code plateauShapeProblem} in {@code standalone.html}): keep them alike.
     *
     * @return the problems, one sentence each, in the order of the patches; empty when the shape is right
     */
    public List<String> shapeProblems() {
        val problems = new ArrayList<String>();
        // the position is the one in the file, which a null item does not change
        val written = patches == null ? List.<Patch>of() : patches;
        for (int i = 0; i < written.size(); i++) {
            val patch = written.get(i);
            if (patch == null) {
                continue;
            }
            if (patch.hasTarget() && patch.hasJsonPath()) {
                problems.add("`patches[" + i + "]` has a `target` and a `json-path`: write one of them");
            } else if (!patch.hasTarget() && !patch.hasJsonPath()) {
                problems.add("`patches[" + i + "]` has no selector: write a `target` or a `json-path`");
            }
        }
        return problems;
    }
}

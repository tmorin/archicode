package io.morin.archicode.resource.plateau;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

/**
 * A change that a plateau makes to the graph of the plateau it overrides, as it is written in the {@code patches} of a
 * manifest of kind {@code plateau}. It is data here: the kernel applies the patches of a layer, in order, once the
 * manifests of the layer are added ({@code apply_patches}, see the README of the viewpoint kernel); this class only reads
 * the keys the kernel takes, and tells what is wrong with their shape.
 * <p>
 * The keys are the kernel's: {@code operator}; exactly one of {@code target} (a full reference, in {@code layer}) or {@code
 * json-path} (RFC 9535, with {@code expect} for the number of nodes it selects); {@code field}; {@code where} (finds a
 * relationship by its destination and its label); {@code value}. What the kernel checks of their combinations (a {@code
 * REMOVE} takes no {@code value}, a {@code where} goes with {@code SET}, a patch never changes an {@code id} or a {@code
 * parent}...) is told by the kernel when the layer is built, with the plateau and the rank of the patch.
 * <p>
 * The reader takes an operator and a layer in any case ({@code remove}, {@code Technology}), as it does every enum; the kernel
 * takes {@code REMOVE} and {@code technology} only. Whoever hands a patch to the kernel writes {@link Operator#name()} and the
 * lowercase name of the {@link Layer}.
 */
@Value
@Builder(toBuilder = true)
@Jacksonized
@ToString(onlyExplicitlyIncluded = true)
public class Patch {

    /** The operators of a patch. */
    public enum Operator {
        REMOVE,
        SET,
        ADD,
        MERGE
    }

    /** The layer a {@code target} is looked for in. */
    public enum Layer {
        APPLICATION,
        TECHNOLOGY
    }

    @NonNull
    @JsonProperty(required = true)
    @ToString.Include
    Operator operator;

    /** A full reference: selects exactly one element. */
    @ToString.Include
    String target;

    /** The layer of {@code target}: the application layer when absent. */
    Layer layer;

    /** A JSONPath (RFC 9535) over the document of the workspace: selects at least one node, or {@code expect}. */
    @JsonProperty("json-path")
    @JsonAlias("json_path")
    @ToString.Include
    String jsonPath;

    /** The number of nodes a {@code json-path} selects. */
    Integer expect;

    /** The field of the selected element that changes. */
    String field;

    /** Finds the relationship a {@code SET} changes: by its destination and its label. */
    Where where;

    /** What is set, added or merged. A {@code null} that is written is a value of the patch, not a missing one. */
    @JsonSetter(nulls = Nulls.SET)
    JsonNode value;

    /** How a relationship is found: a relationship has no id of its own. */
    @Value
    @Builder(toBuilder = true)
    @Jacksonized
    public static class Where {

        @NonNull
        @JsonProperty(required = true)
        String destination;

        String label;
    }

    /** Whether the patch says what it selects with a {@code target}. */
    public boolean hasTarget() {
        return target != null;
    }

    /** Whether the patch says what it selects with a {@code json-path}. */
    public boolean hasJsonPath() {
        return jsonPath != null;
    }
}

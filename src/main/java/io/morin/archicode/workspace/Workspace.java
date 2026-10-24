package io.morin.archicode.workspace;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.morin.archicode.resource.view.View;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.Delegate;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder(toBuilder = true)
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Workspace {

    @JsonIgnore
    @Builder.Default
    public ElementIndex appIndex = ElementIndex.builder().build();

    @JsonIgnore
    @Builder.Default
    public ElementIndex techIndex = ElementIndex.builder().build();

    @JsonIgnore
    @Builder.Default
    public ViewIndex viewIndex = ViewIndex.builder().build();

    /**
     * The sentence for a reference that leads nowhere and that an element of the graph holds (a relationship destination, a
     * {@code uses} entry, a hosted application): the element, the file and the key. Empty when no element holds it.
     *
     * @param missing the reference that no element has
     * @return the sentence, as the layered check tells it, without a plateau
     */
    public java.util.Optional<String> danglingSentence(String missing) {
        return DanglingReferences.about(missing, appIndex, techIndex);
    }

    /** True for the workspace of a facet: its views are about the flow the facet keeps, and are drawn as such. */
    @JsonIgnore
    @Getter
    @Builder.Default
    boolean faceted = false;

    /** True for the workspace of a facet that leaves out what none of its links goes through. */
    @JsonIgnore
    @Getter
    @Builder.Default
    boolean hideUnlinked = false;

    /**
     * The plateau this workspace was read from, or null for a workspace without plateaus (one set of manifests).
     */
    @JsonIgnore
    @Getter
    io.morin.archicode.resource.workspace.Settings.Plateau plateau;

    /**
     * The plateaus of a workspace that has layered plateaus (see {@link io.morin.archicode.resource.plateau.PlateauTree}),
     * which {@link #plateau} is one of; null for a workspace without plateaus.
     */
    @JsonIgnore
    @Getter
    io.morin.archicode.resource.plateau.PlateauTree plateauTree;

    /**
     * The {@code REMOVE} patches that were applied to build the plateau of a layered workspace, in the order they were
     * applied, with what each took out of the graph; none for any other workspace.
     */
    @JsonIgnore
    @Getter
    @Builder.Default
    java.util.List<Removal> removals = java.util.List.of();

    /**
     * The plateaus of the chain a layered plateau was built from, the root first, each as its layer left it; none for any
     * other workspace. A comparison several layers apart composes the {@code replaces} of the layers in between from them.
     */
    @JsonIgnore
    @Getter
    @Builder.Default
    java.util.List<PlateauStep> steps = java.util.List.of();

    /**
     * The plateau this workspace is compared with, for the workspace of a comparison (it holds the plateau and what only
     * the baseline has: see {@code WorkspaceFactory.createUnion}); null otherwise.
     */
    @JsonIgnore
    @Getter
    io.morin.archicode.resource.workspace.Settings.Plateau baseline;

    /** What was read: the elements, the views, the stories, the settings, the styles and the formatters. */
    @JsonIgnore
    @Getter
    @Delegate
    io.morin.archicode.resource.workspace.Workspace resources;

    public ElementIndex resolveMainIndexForView(View view) {
        if (view.getLayer().equals(View.Layer.APPLICATION)) {
            return appIndex;
        }
        return techIndex;
    }
}

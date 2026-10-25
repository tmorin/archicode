package io.morin.archicode.cli;

import io.morin.archicode.Warnings;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.kernel.KernelViewpointFactory;
import io.morin.archicode.workspace.Workspace;
import java.util.List;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * Whether a view can be drawn in a plateau, shared by {@code views generate} (the views) and {@code stories generate} (the
 * steps of a story).
 */
@UtilityClass
class ViewInPlateau {

    /**
     * A view belongs to no plateau (issue #100), and a plateau may not have an element it names. The load has checked that the
     * element exists in at least one plateau, so here it is not a mistake of the view: an entry of a map ({@code pinned},
     * {@code opened}, {@code hidden}) that the plateau drawn lacks is left out, with a warning; a map none of whose pinned
     * elements is there, and a view whose element is not there, cannot be drawn in this plateau and are skipped, with a
     * warning. The editor does the same and says so in the view. A workspace without plateaus is not concerned: a name that
     * is not there is then a mistake of the view. The workspace of a facet is asked about the plateau it was made from: what
     * the facet removes is the facet's (it is dropped from a map without a word, and a view of an element it removes is a mistake
     * told before anything is written, see {@code requireViewsKeepTheirElement}).
     *
     * @param named   how a skip names what is not drawn: {@code `v`} for a view, {@code story/3} for a step
     * @param subject how the warning about a map drawn without some entries names it: {@code the view `v`}, {@code the step story/3}
     * @return whether the view is to be drawn
     */
    static boolean canBeDrawn(Warnings warnings, Workspace workspace, View view, String named, String subject) {
        if (workspace.getPlateau() == null) {
            return true;
        }
        val plateau = workspace.getPlateau().getId();
        val index = workspace.resolveMainIndexForView(view);
        val properties = view.getProperties();
        if (!KernelViewpointFactory.MAP.equals(view.getViewpoint())) {
            val element = properties == null ? "" : properties.path("element").asText("");
            if (!element.isBlank() && index.searchElement(element).isEmpty()) {
                warnings.warn("skip %s: it names `%s`, which the plateau `%s` does not have", named, element, plateau);
                return false;
            }
            return true;
        }
        val missing = new java.util.TreeSet<String>();
        val pinned = new java.util.ArrayList<String>();
        for (val list : List.of("pinned", "opened", "hidden")) {
            if (properties != null) {
                properties.path(list).forEach(entry -> {
                    if (entry.isTextual()) {
                        if ("pinned".equals(list)) {
                            pinned.add(entry.asText());
                        }
                        if (index.searchElement(entry.asText()).isEmpty()) {
                            missing.add(entry.asText());
                        }
                    }
                });
            }
        }
        if (missing.isEmpty()) {
            return true;
        }
        val names = String.join(
            ", ",
            missing
                .stream()
                .map(name -> "`" + name + "`")
                .toList()
        );
        if (!pinned.isEmpty() && missing.containsAll(pinned)) {
            warnings.warn(
                "skip %s: it is pinned on %s, which the plateau `%s` does not have",
                named,
                String.join(
                    ", ",
                    new java.util.TreeSet<>(pinned)
                        .stream()
                        .map(name -> "`" + name + "`")
                        .toList()
                ),
                plateau
            );
            return false;
        }
        warnings.warn("%s is drawn without %s, which the plateau `%s` does not have", subject, names, plateau);
        return true;
    }
}

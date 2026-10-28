package io.morin.archicode.cli;

import io.morin.archicode.Warnings;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.KernelViewpointFactory;
import io.morin.archicode.viewpoint.kernel.MapLinks;
import io.morin.archicode.workspace.ElementIndex;
import io.morin.archicode.workspace.Workspace;
import java.util.List;
import java.util.function.Supplier;
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
        return canBeDrawn(warnings, workspace, view, named, subject, () -> null);
    }

    /**
     * As above, for a view drawn in a comparison: a link may name a relationship that only the plateau compared with has (it is
     * drawn as removed).
     *
     * @param comparison the comparison the view is drawn in, asked only when a link needs it; may answer {@code null}
     */
    static boolean canBeDrawn(
        Warnings warnings,
        Workspace workspace,
        View view,
        String named,
        String subject,
        Supplier<Comparison> comparison
    ) {
        return canBeDrawn(warnings, workspace, view, named, subject, comparison, comparison);
    }

    /**
     * As above; {@code highlighted} is the comparison that decides which {@code highlight} entries the plateau lacks, which is
     * the comparison of the run even when the plateau alone is drawn (a relationship that the plateau removed is not missing from a
     * run that compares it, wave 026 run 0198).
     */
    static boolean canBeDrawn(
        Warnings warnings,
        Workspace workspace,
        View view,
        String named,
        String subject,
        Supplier<Comparison> comparison,
        Supplier<Comparison> highlighted
    ) {
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
            return partsCanBeDrawn(warnings, index, view, named, subject, plateau, comparison, highlighted);
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
        return partsCanBeDrawn(warnings, index, view, named, subject, plateau, comparison, highlighted);
    }

    /** The {@code links} decide whether the map is drawn; the {@code highlight} only says what it lacks (wave 026, run 0198). */
    private static boolean partsCanBeDrawn(
        Warnings warnings,
        ElementIndex index,
        View view,
        String named,
        String subject,
        String plateau,
        Supplier<Comparison> comparison,
        Supplier<Comparison> highlighted
    ) {
        if (!linksCanBeDrawn(warnings, index, view, named, subject, plateau, comparison)) {
            return false;
        }
        val entries = MapLinks.wellFormed(view.getProperties(), MapLinks.HIGHLIGHT);
        if (entries.isEmpty() || view.getLayer() == View.Layer.TECHNOLOGY) {
            return true;
        }
        val compared = highlighted.get();
        entries
            .stream()
            .filter(entry -> !MapLinks.exists(index, entry))
            .filter(entry -> compared == null || !MapLinks.existsInUnion(compared, entry))
            .forEach(entry ->
                warnings.warn(
                    "%s is drawn without the highlight `%s -> %s`, which the plateau `%s` does not have",
                    subject,
                    entry.get("source").asText(),
                    entry.get("destination").asText(),
                    plateau
                )
            );
        return true;
    }

    /**
     * The {@code links} of a map (issue #143): an entry whose relationship the plateau lacks is left out, with a warning; a
     * map none of whose links is there is skipped. The map of the technology layer reads no links (the kernel refuses them).
     */
    private static boolean linksCanBeDrawn(
        Warnings warnings,
        ElementIndex index,
        View view,
        String named,
        String subject,
        String plateau,
        Supplier<Comparison> comparison
    ) {
        val entries = MapLinks.wellFormed(view.getProperties());
        if (entries.isEmpty() || view.getLayer() == View.Layer.TECHNOLOGY) {
            return true;
        }
        val compared = comparison.get();
        val absent = entries
            .stream()
            .filter(entry -> !MapLinks.exists(index, entry))
            .filter(entry -> compared == null || !MapLinks.existsInUnion(compared, entry))
            .toList();
        if (absent.size() == entries.size()) {
            warnings.warn("skip %s: none of its links is in the plateau `%s`", named, plateau);
            return false;
        }
        absent.forEach(entry ->
            warnings.warn(
                "%s is drawn without the link `%s -> %s`, which the plateau `%s` does not have",
                subject,
                entry.get("source").asText(),
                entry.get("destination").asText(),
                plateau
            )
        );
        return true;
    }
}

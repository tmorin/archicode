package io.morin.archicode.workspace;

import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import lombok.val;

/**
 * What a {@code REMOVE} patch of a plateau took out of the graph, as the kernel reports it ({@code removed} and {@code
 * dropped} of {@code apply_patches}): the elements that left, the subtree included, and the entries taken out of the
 * elements that stay (a relationship towards a removed element, an entry of {@code uses} or {@code applications}).
 *
 * <p>The patch names what it selects; what it took besides, its <em>cascade</em>, is what the table of changes lists next to
 * the rows (see {@link #cascade}).
 *
 * @param plateau  the plateau whose patch it is
 * @param rank     the rank of the patch in its plateau, from 1
 * @param operator the operator ({@code REMOVE})
 * @param selector how the patch says what it selects, as the kernel writes it ({@code target shop.cache})
 * @param touched  the elements the patch selected
 * @param removed  every element that left the graph, the ones inside the selected ones included
 * @param dropped  the entries taken out of the elements that stay
 */
public record Removal(
    String plateau,
    int rank,
    String operator,
    String selector,
    List<Ref> touched,
    List<Ref> removed,
    List<Dropped> dropped
) {
    /** An element of a layer. */
    public record Ref(String layer, String reference) {}

    /**
     * An entry taken out of an element that stays.
     *
     * @param layer  the layer of the element
     * @param holder the reference of the element that held the entry
     * @param field  {@code relationships}, {@code uses} or {@code applications}
     * @param entry  the entry: the destination of a relationship, or the reference
     * @param label  the label of the relationship, or null (an entry of {@code uses} or {@code applications} has none)
     */
    public record Dropped(String layer, String holder, String field, String entry, String label) {
        /** The entry as the table says it: {@code shop.cache (flushes)} for a relationship that has a label. */
        public String text() {
            return label == null ? entry : entry + " (" + label + ")";
        }
    }

    /**
     * One line of the cascade.
     *
     * @param plateau the plateau of the patch
     * @param rank    the rank of the patch
     * @param patch   the patch as a text: {@code REMOVE target shop.cache}
     * @param effect  {@code removed} (an element that left with the one the patch selected) or {@code dropped} (an entry
     *                taken out of an element that stays)
     * @param layer   the layer of the element
     * @param element the element that left, or the one that held the entry
     * @param detail  for an entry, the field and the entry ({@code relationships: shop.cache}); empty for an element
     */
    public record Effect(
        String plateau,
        int rank,
        String patch,
        String effect,
        String layer,
        String element,
        String detail
    ) {}

    /**
     * What the patch took besides what it selected, and that the plateau {@code base} has: the elements that left with the
     * selected ones, then the entries taken out of the elements that stay, each sorted. An element or an entry that
     * {@code base} does not have was not in the plateau the target is compared with, so it is no part of the difference.
     *
     * @param base the plateau the target is compared with
     * @return the lines of the cascade; empty when the patch took nothing more
     */
    public List<Effect> effects(Workspace base) {
        val patch = operator + " " + selector;
        val out = new ArrayList<Effect>();
        val selected = new LinkedHashSet<>(touched);
        removed
            .stream()
            .filter(r -> !selected.contains(r))
            .filter(r -> indexOf(base, r.layer()).searchElement(r.reference()).isPresent())
            .sorted(Comparator.comparing(Ref::layer).thenComparing(Ref::reference))
            .forEach(r -> out.add(new Effect(plateau, rank, patch, "removed", r.layer(), r.reference(), "")));
        dropped
            .stream()
            .filter(d -> heldIn(base, d))
            .sorted(
                Comparator.comparing(Dropped::layer)
                    .thenComparing(Dropped::holder)
                    .thenComparing(Dropped::field)
                    .thenComparing(Dropped::text)
            )
            .forEach(d ->
                out.add(new Effect(plateau, rank, patch, "dropped", d.layer(), d.holder(), d.field() + ": " + d.text()))
            );
        return out;
    }

    private static ElementIndex indexOf(Workspace workspace, String layer) {
        return "technology".equals(layer) ? workspace.techIndex : workspace.appIndex;
    }

    /** Whether the element of {@code base} held the entry that was taken out. */
    private static boolean heldIn(Workspace base, Dropped dropped) {
        val holder = indexOf(base, dropped.layer()).searchElement(dropped.holder());
        if (holder.isEmpty()) {
            return false;
        }
        val element = holder.get();
        return switch (dropped.field()) {
            case "relationships" -> element.getRelationships() != null &&
                element
                    .getRelationships()
                    .stream()
                    .anyMatch(
                        r ->
                            r.getDestination().equals(dropped.entry()) &&
                            Objects.equals(
                                r.getLabel() == null ? "" : r.getLabel(),
                                dropped.label() == null ? "" : dropped.label()
                            )
                    );
            case "uses" -> element instanceof Environment e &&
                e.getUses() != null &&
                e.getUses().contains(dropped.entry());
            case "applications" -> element instanceof Node n &&
                n.getApplications() != null &&
                n.getApplications().contains(dropped.entry());
            default -> false;
        };
    }

    /**
     * The cascade of the removals that tell what the target plateau changed since the plateau it is compared with: the
     * effects of its {@code REMOVE} patches (those of every plateau of its chain) that the other plateau has, that is an
     * element the other plateau has and the target no longer has, and an entry the other plateau's element held. What the
     * plateaus share (a removal of a plateau below both) is not in the other plateau, and neither is what a plateau of the
     * chain added and another removed again, so none of it is listed: the cascade is part of the difference between the
     * two, not of the history of the target. The order is the one of the chain, then the rank.
     *
     * @param all  the removals of the chain of the target, in the order they were applied
     * @param base the plateau the target is compared with
     * @return the lines of the cascade; empty when the patches took nothing besides what they selected
     */
    public static List<Effect> cascade(List<Removal> all, Workspace base) {
        val out = new ArrayList<Effect>();
        all.forEach(removal -> out.addAll(removal.effects(base)));
        return out;
    }
}

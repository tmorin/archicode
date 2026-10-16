package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.TreeSet;
import lombok.NonNull;
import lombok.val;

/**
 * The names the boxes of a view are given in the PlantUML, which are not always the ids of the items.
 *
 * <p>PlantUML reads a name made of letters, digits, {@code _} and {@code .}; any other character (a hyphen, above all, as
 * in {@code shop.report-a}) ends the name, so the box or the link that uses it is refused and so is the whole view.
 * An id made of the characters PlantUML reads is its own name, byte for byte. Any other id gets its name by replacing each
 * character PlantUML does not read with {@code _}; a name that another id of the view already has (the view holds both
 * {@code shop.report-a} and {@code shop.report_a}) is told apart by a number ({@code shop.report_a_2}), so that two boxes
 * are never merged into one. The names are given in the order of the ids, so they do not change from one run to the next.
 */
final class PlantumlNames {

    private final Map<String, String> byId;

    private PlantumlNames(Map<String, String> byId) {
        this.byId = byId;
    }

    /** The names of every item of the view (the ones inside the others too) and of the ends of its links. */
    static PlantumlNames of(@NonNull Viewpoint viewpoint) {
        val ids = new TreeSet<String>();
        viewpoint.getItems().forEach(item -> item.stream().forEach(inside -> ids.add(inside.getItemId())));
        for (val link : viewpoint.getLinks()) {
            ids.add(link.getFrom().getItemId());
            ids.add(link.getTo().getItemId());
        }

        // a name that needs no change is never taken from the id that has it
        val taken = new HashSet<String>();
        for (val id : ids) {
            if (isReadable(id)) {
                taken.add(id);
            }
        }
        val byId = new HashMap<String, String>();
        for (val id : ids) {
            if (!isReadable(id)) {
                val base = replaceUnreadable(id);
                var name = base;
                for (var n = 2; !taken.add(name); n++) {
                    name = base + "_" + n;
                }
                byId.put(id, name);
            }
        }
        return new PlantumlNames(byId);
    }

    /** The name of the item in the PlantUML. */
    String of(@NonNull Item item) {
        return of(item.getItemId());
    }

    private String of(String id) {
        // an id the view does not hold (a renderer called by itself) has no neighbour to be told apart from
        return isReadable(id) ? id : byId.getOrDefault(id, replaceUnreadable(id));
    }

    private static boolean isReadable(String id) {
        return id.codePoints().allMatch(PlantumlNames::isReadable);
    }

    private static boolean isReadable(int c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '.';
    }

    private static String replaceUnreadable(String id) {
        val buf = new StringBuilder();
        id.codePoints().forEach(c -> buf.appendCodePoint(isReadable(c) ? c : '_'));
        return buf.toString();
    }
}

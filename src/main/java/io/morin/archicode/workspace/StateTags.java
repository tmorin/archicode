package io.morin.archicode.workspace;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The states a plateau comparison computes ({@code new}, {@code changed}, {@code removed}, {@code moved}, {@code split},
 * {@code merged}, {@code contains-changes}) are also words an author may have written by hand, as a qualifier or in the
 * {@code rendering-stereotypes} tag, from the days when nothing computed them.
 *
 * <p>The rule (wave 009, D-5) is the editor's: a box gets the default look of a state only when the state is computed for
 * it. A word written by hand keeps the author's own style of that name, and nothing else. This class says, for each such
 * word, where the author's word and the computed state do not agree, so that the author is not surprised by a box that is
 * not drawn as the word says. It is made of sentences, and prints nothing: the application's log level is
 * {@code ERROR}, which hides {@code log.warn}, so the commands hand the sentences to {@code Warnings}, which the command line prints
 * on its error output.
 */
@UtilityClass
public class StateTags {

    private static final String TAG = "rendering-stereotypes";

    private static final Set<String> STATES = Set.of(
        "new",
        "changed",
        "removed",
        "moved",
        "split",
        "merged",
        "contains-changes"
    );

    /**
     * What disagrees, as sentences, in a stable order (layer, then reference, then the order of the words).
     *
     * @param workspace  the workspace that is drawn (the union of two plateaus for a comparison)
     * @param comparison what the comparison computed for it, or null when nothing is compared
     * @return one sentence per element and word (without {@code warning:}, which the channel adds); none for a workspace without plateaus, which has no comparison to
     * disagree with, or when every word written by hand is the state of its element
     */
    public List<String> warnings(@NonNull Workspace workspace, Comparison comparison) {
        if (workspace.getPlateau() == null) {
            return List.of();
        }
        val out = new ArrayList<String>();
        check(out, "application", workspace.appIndex, workspace, comparison);
        check(out, "technology", workspace.techIndex, workspace, comparison);
        return out;
    }

    private void check(List<String> out, String layer, ElementIndex index, Workspace workspace, Comparison comparison) {
        val computed = computed(layer, comparison);
        val references = new TreeMap<String, Element>();
        index.listAllElementReferences(element -> true).forEach(r -> references.put(r, index.getElementByReference(r)));
        references.forEach((reference, element) -> {
            val written = written(element);
            written.forEach((word, source) -> {
                val state = comparison == null ? null : stateOf(reference, computed);
                if (!word.equals(state)) {
                    out.add(sentence(reference, word, source, state, workspace, comparison));
                }
            });
        });
    }

    /** The words of the author that are the name of a state, with where they wrote it. */
    private Map<String, String> written(Element element) {
        val words = new LinkedHashMap<String, String>();
        element
            .getQualifiers()
            .stream()
            .filter(STATES::contains)
            .forEach(word -> words.putIfAbsent(word, "qualifier"));
        val tag = element.getTags().get(TAG);
        if (tag != null) {
            for (val word : tag.trim().split("\\s+")) {
                if (STATES.contains(word)) {
                    words.putIfAbsent(word, "`" + TAG + "` tag");
                }
            }
        }
        return words;
    }

    /** The change of each element of a layer, by reference. */
    private Map<String, Change> computed(String layer, Comparison comparison) {
        val changes = new TreeMap<String, Change>();
        if (comparison != null) {
            comparison
                .getElements()
                .stream()
                .filter(e -> e.layer().equals(layer))
                .forEach(e -> changes.put(e.reference(), e.change()));
        }
        return changes;
    }

    /**
     * The state of an element in a comparison: its own change, else {@code contains-changes} when an element below it in
     * the tree of references has one (the rule of the kernel), else null.
     */
    private String stateOf(String reference, Map<String, Change> changes) {
        val own = changes.getOrDefault(reference, Change.NONE);
        if (own.isChange()) {
            return own.word();
        }
        val prefix = reference + ".";
        return changes
            .entrySet()
            .stream()
            .anyMatch(e -> e.getValue().isChange() && e.getKey().startsWith(prefix))
            ? "contains-changes"
            : null;
    }

    private String sentence(
        String reference,
        String word,
        String source,
        String state,
        Workspace workspace,
        Comparison comparison
    ) {
        val head = String.format("the element `%s` carries `%s` (%s)", reference, word, source);
        val own = String.format(
            "it is drawn with your own `styles` entry named `%s` (if any) and not with the default look of the state",
            word
        );
        if (comparison == null) {
            return String.format(
                "%s, which is a state of a comparison, and nothing is compared here: %s. Compare two plateaus (`--baseline`) and the states are computed, or drop the word.",
                head,
                own
            );
        }
        val said =
            state == null
                ? "finds that it did not change and holds no change"
                : state.equals("contains-changes")
                  ? "finds that it did not change by itself but holds a change"
                  : "finds that it is " + state;
        return String.format(
            "%s, but the comparison of `%s` with `%s` %s: %s. The comparison computes the states, so the word can be dropped.",
            head,
            nameOf(comparison.getTarget() == null ? workspace.getPlateau() : comparison.getTarget()),
            nameOf(comparison.getBase() == null ? workspace.getBaseline() : comparison.getBase()),
            said,
            own
        );
    }

    private String nameOf(io.morin.archicode.resource.workspace.Settings.Plateau plateau) {
        return plateau == null ? "the other plateau" : plateau.getId();
    }
}

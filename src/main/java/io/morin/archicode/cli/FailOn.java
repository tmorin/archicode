package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.KernelStates;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The states that make {@code archicode diff --fail-on} exit with {@link ErrorOutput#CHANGES_FOUND}: the seven words of the
 * viewpoint kernel ({@link KernelStates}) and {@code any}, written in a list separated by commas.
 *
 * <p>What is looked at is the table of the comparison, the one {@code diff} prints: a row of a state is a change of that state, a
 * row that {@code --no-wording} leaves out is not one, and {@code contains-changes} is an element that did not change itself and
 * has an element below it in the tree of references that did (the rule of the kernel, as {@code StateTags} applies it).
 */
@UtilityClass
class FailOn {

    /** Every state: new, changed, removed, moved, split, merged, whichever of them the comparison holds. */
    static final String ANY = "any";

    /**
     * Reads the values of the option, which may be repeated, each a list separated by commas.
     *
     * @param values what was written after {@code --fail-on}, or null
     * @return the words, in the order they were written, without repeats
     * @throws ArchiCodeException when a word is empty or is not a state of the kernel nor {@code any}
     */
    static Set<String> parse(List<String> values) {
        val words = new LinkedHashSet<String>();
        if (values == null) {
            return words;
        }
        for (val value : values) {
            for (val part : value.split(",", -1)) {
                val word = part.trim();
                if (word.isEmpty()) {
                    throw new ArchiCodeException(
                        "`--fail-on` has an empty state in `%s`: write the states separated by commas, from %s",
                        value,
                        known()
                    );
                }
                if (!word.equals(ANY) && !KernelStates.words().contains(word)) {
                    throw new ArchiCodeException("`--fail-on` does not know the state `%s`: use %s", word, known());
                }
                words.add(word);
            }
        }
        return words;
    }

    /**
     * @param comparison what the comparison holds
     * @param states     the words of {@link #parse(List)}
     * @param hideWording the comparison is printed with {@code --no-wording}: a change of the description only is not counted
     * @return true when the comparison holds a change of one of the states
     */
    static boolean holds(Comparison comparison, Set<String> states, boolean hideWording) {
        if (states.isEmpty()) {
            return false;
        }
        val any = states.contains(ANY);
        for (val row : comparison.getChanges()) {
            if (!(hideWording && row.wordingOnly()) && (any || states.contains(row.change().word()))) {
                return true;
            }
        }
        return states.contains(KernelStates.container()) && holdsAChange(comparison, hideWording);
    }

    /**
     * An element of the union that did not change itself and has below it, in the same layer, one that did: the elements the
     * kernel gives {@code contains_changes} (an element it draws as changed, such as a replaced one kept to place a removed one,
     * is not one).
     */
    private static boolean holdsAChange(Comparison comparison, boolean hideWording) {
        val holders = new HashSet<String>();
        for (val element : comparison.getElements()) {
            if (element.change().isChange() && !(hideWording && element.wordingOnly())) {
                val reference = element.reference();
                for (var dot = reference.lastIndexOf('.'); dot > 0; dot = reference.lastIndexOf('.', dot - 1)) {
                    holders.add(element.layer() + ":" + reference.substring(0, dot));
                }
            }
        }
        return comparison
            .getElements()
            .stream()
            .anyMatch(
                element ->
                    element.change() == Change.NONE && holders.contains(element.layer() + ":" + element.reference())
            );
    }

    private static String known() {
        val words = new ArrayList<String>(KernelStates.all());
        words.add(ANY);
        return String.join(
            ", ",
            words
                .stream()
                .map(word -> "`" + word + "`")
                .toList()
        );
    }
}

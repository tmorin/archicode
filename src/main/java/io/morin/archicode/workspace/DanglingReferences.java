package io.morin.archicode.workspace;

import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * What a graph points at that is not there: a relationship whose destination names no element, an environment that {@code uses}
 * an environment that is not there, a node that hosts an application that is not there. One place says it, in the author's
 * words: the element that holds the reference, what it points at, the file that declares the element and the key of the
 * reference in that element ({@code relationships[0].destination}, {@code uses[1]}, {@code applications[0]}). The layered
 * check ({@link LayerLoader}) and the places where a command that already fails on such a reference says so (issue #159) read
 * it; the editor says the same ({@code layerProblemsOf} in {@code standalone.html}): keep them alike.
 */
@UtilityClass
public class DanglingReferences {

    /** A reference that leads nowhere: who has it, what it points at, and the sentence. */
    public record Problem(String element, String other, String sentence) {}

    /**
     * Every reference of the two layers that leads nowhere.
     *
     * @param application the elements of the application layer
     * @param technology  the elements of the technology layer
     * @param applicationFiles the file that declares each element of the application layer, by reference (none known: no file is told)
     * @param technologyFiles  the same for the technology layer
     * @return the problems, unsorted
     */
    public static List<Problem> find(
        ElementIndex application,
        ElementIndex technology,
        Map<String, String> applicationFiles,
        Map<String, String> technologyFiles
    ) {
        val problems = new ArrayList<Problem>();
        for (val layer : List.of(application, technology)) {
            val files = layer == application ? applicationFiles : technologyFiles;
            new TreeMap<>(layer.elementByReferenceIndex).forEach((reference, element) -> {
                val file = files.get(reference);
                var position = 0;
                for (val relationship : orEmpty(element.getRelationships())) {
                    val at = "relationships[" + position++ + "].destination";
                    if (layer.searchElement(relationship.getDestination()).isEmpty()) {
                        problems.add(
                            problem(reference, relationship.getDestination(), "has a relationship towards", file, at)
                        );
                    }
                }
                position = 0;
                if (element instanceof Environment environment) {
                    for (val used : orEmpty(environment.getUses())) {
                        val at = "uses[" + position++ + "]";
                        if (layer.searchElement(used).isEmpty()) {
                            problems.add(problem(reference, used, "uses", file, at));
                        }
                    }
                }
                position = 0;
                if (element instanceof Node node) {
                    for (val hosted : orEmpty(node.getApplications())) {
                        val at = "applications[" + position++ + "]";
                        if (application.searchElement(hosted).isEmpty()) {
                            problems.add(problem(reference, hosted, "hosts", file, at));
                        }
                    }
                }
            });
        }
        return problems;
    }

    private static <T> Set<T> orEmpty(Set<T> set) {
        return set == null ? Set.of() : set;
    }

    private static Problem problem(String element, String other, String verb, String file, String key) {
        return new Problem(
            element,
            other,
            "`" +
                element +
                "` " +
                verb +
                " `" +
                other +
                "`, which does not exist, " +
                (file == null ? "" : "in `" + file + "` ") +
                "at `" +
                key +
                "`"
        );
    }

    /**
     * One sentence for each thing that is missing, sorted by element and then by what is missing: the elements that point at
     * it are one cause, so the first is told, with how many others there are.
     *
     * @param problems the problems
     * @param plateau  the plateau they are told in ({@code in the plateau `p`, } first), or null for a workspace with no plateau
     * @return the sentences
     */
    public static List<String> sentences(List<Problem> problems, String plateau) {
        val byMissing = new LinkedHashMap<String, List<Problem>>();
        problems
            .stream()
            .sorted(
                Comparator.comparing(Problem::element).thenComparing(Problem::other).thenComparing(Problem::sentence)
            )
            .forEach(problem -> byMissing.computeIfAbsent(problem.other(), k -> new ArrayList<>()).add(problem));
        return byMissing
            .values()
            .stream()
            .map(group -> sentence(group, plateau))
            .toList();
    }

    /** The sentence for one thing that is missing, from the problems that point at it (the first by element). */
    private static String sentence(List<Problem> group, String plateau) {
        val others = group.stream().map(Problem::element).distinct().count() - 1;
        val first = (plateau == null ? "" : "in the plateau `" + plateau + "`, ") + group.get(0).sentence();
        if (others == 0) {
            return first;
        }
        val scope = plateau == null ? "" : " of the plateau";
        return (
            first +
            " (" +
            others +
            (others == 1 ? " more element" + scope + " points at it)" : " more elements" + scope + " point at it)")
        );
    }

    /**
     * The sentence for a reference that a command could not follow, when an element of the graph points at it: the one the
     * layered check tells, without a plateau. Empty when nothing points at it (a view that names it, say), so that the caller
     * keeps its own words.
     *
     * @param missing the reference that leads nowhere
     * @param application the elements of the application layer
     * @param technology  the elements of the technology layer
     * @return the sentence
     */
    public static Optional<String> about(String missing, ElementIndex application, ElementIndex technology) {
        val found = find(application, technology, application.sourceByReference, technology.sourceByReference)
            .stream()
            .filter(problem -> problem.other().equals(missing))
            .toList();
        return found.isEmpty() ? Optional.empty() : Optional.of(sentences(found, null).get(0));
    }
}

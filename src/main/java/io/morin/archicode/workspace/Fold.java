package io.morin.archicode.workspace;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.plateau.Plateau;
import io.morin.archicode.resource.plateau.PlateauTree;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import lombok.val;

/**
 * What folding a plateau into the plateau above it would do (wave 028, run 0207, issue #65). It is pure: it is given the
 * facts of a workspace and returns a {@link Plan} or throws an {@link io.morin.archicode.ArchiCodeException} whose message
 * is the sentence of a refusal. It reads no file, knows no command line and writes nothing, so that a test, the writer of a
 * later run and a later endpoint call the same code.
 * <p>
 * The refusals are checked in a fixed order and the first one found is the only one told: the plateau is unknown, it is the
 * root, it is a leaf, several plateaus are above it, {@code settings.current} names it, a step of a story names it. The
 * composition (the {@code replaces} to rewrite) is asked for only when every refusal has passed.
 */
public final class Fold {

    private Fold() {}

    /**
     * What the fold would do.
     *
     * @param folded        the plateau that is folded
     * @param into          the plateau above it, which keeps its id and takes what the folded plateau had
     * @param newParent     the plateau that {@code into} overrides after the fold: the parent of the folded plateau
     * @param rewritten     the files that are written again, sorted and distinct, relative to the workspace folder: the
     *                      manifests whose header names the folded plateau, the manifest of {@code into}, and the files of
     *                      the elements of {@code into} that hold a {@code replaces} entry to compose
     * @param deleted       the manifest of the folded plateau, or empty when only headers name it
     * @param foldedPatches the number of patches of the folded plateau
     * @param intoPatches   the number of patches of {@code into}
     * @param replaces      the {@code replaces} entries to compose
     * @param stay          the plateaus that are neither folded nor {@code into}, sorted
     */
    public record Plan(
        String folded,
        String into,
        String newParent,
        List<String> rewritten,
        List<String> deleted,
        int foldedPatches,
        int intoPatches,
        List<ReplacesChange> replaces,
        List<String> stay
    ) {}

    /**
     * An entry of {@code replaces} of the plateau above that names an element the folded plateau declares, and what it must
     * name after the fold.
     *
     * @param where   the file that holds the entry, or {@code patch n of `into`} with {@code n} the 1-based place of the
     *                patch in the {@code patches} of {@code into}, as written
     * @param element the element that holds the entry
     * @param from    the references of the entry that the folded plateau declares, in the order of the entry
     * @param to      what those elements replaced themselves, distinct and sorted; empty when they replaced nothing
     */
    public record ReplacesChange(String where, String element, List<String> from, List<String> to) {}

    /**
     * A step of a story that names a plateau, by {@code at} or {@code against}; either may be null.
     *
     * @param story  the id of the story
     * @param source the file of the story, relative to the workspace folder
     * @param number the 1-based place of the step
     * @param at     the plateau the step is told at, or null
     * @param against the plateau the step is compared with, or null
     */
    public record StepNaming(String story, String source, int number, String at, String against) {}

    /**
     * A {@code replaces} entry of the plateau above, as the loader finds it.
     *
     * @param where    the file that holds it, or {@code patch n of `into`}
     * @param element  the element that holds it
     * @param replaces the references it names
     */
    public record Entry(String where, String element, List<String> replaces) {}

    /**
     * What the load of the plateau above tells.
     *
     * @param declaredByFolded the references of the elements the folded plateau declares
     * @param replacedByFolded for each of them, what it replaces once the patches of the folded plateau are applied
     * @param entriesOfInto    the entries of the plateau above, in the order of its files and its patches
     */
    public record Composition(
        Set<String> declaredByFolded,
        Map<String, List<String>> replacedByFolded,
        List<Entry> entriesOfInto
    ) {}

    /**
     * Plans the fold of a plateau into the plateau above it.
     *
     * @param id          the plateau to fold
     * @param tree        the plateaus of the workspace
     * @param current     {@code settings.current}, or null or empty when it names none
     * @param steps       the steps of the stories that name a plateau
     * @param composition asked for once, and only when no refusal applies
     * @return what the fold would do
     * @throws io.morin.archicode.ArchiCodeException with the sentence of the refusal
     */
    public static Plan plan(
        String id,
        PlateauTree tree,
        String current,
        List<StepNaming> steps,
        Supplier<Composition> composition
    ) {
        val node = tree.node(id);
        if (Plateau.BASELINE.equals(id)) {
            throw new ArchiCodeException(
                "the plateau `%s` is the root of the plateaus: nothing is below it to fold it into",
                id
            );
        }
        val above = tree.children(id);
        if (above.isEmpty()) {
            throw new ArchiCodeException(
                "the plateau `%s` is not overridden by any plateau, so there is no plateau above it to fold it into: " +
                    "to remove it, use Delete in the editor",
                id
            );
        }
        if (above.size() > 1) {
            throw new ArchiCodeException(
                "the plateau `%s` is overridden by %s, which do not stack: folding it into one would change the other. " +
                    "Keep it",
                id,
                listOf(
                    above
                        .stream()
                        .map(n -> "`" + n.id() + "`")
                        .toList()
                )
            );
        }
        val into = above.get(0);
        if (id.equals(current)) {
            throw new ArchiCodeException(
                "`settings.current` names the plateau `%s`: write another plateau in `.archicode.yaml` first " +
                    "(`%s` is the one above it)",
                id,
                into.id()
            );
        }
        val naming = stepsNaming(id, steps);
        if (!naming.isEmpty()) {
            throw new ArchiCodeException(
                "the plateau `%s` is named by %s: change those steps first, none is rewritten for you",
                id,
                naming
            );
        }
        return build(node, into, tree, composition.get());
    }

    private static Plan build(PlateauTree.Node folded, PlateauTree.Node into, PlateauTree tree, Composition facts) {
        val changes = new ArrayList<ReplacesChange>();
        val rewritten = new TreeSet<>(folded.headers());
        if (into.manifest() != null) {
            rewritten.add(into.manifest());
        }
        for (val entry : facts.entriesOfInto()) {
            val from = entry.replaces().stream().filter(facts.declaredByFolded()::contains).toList();
            if (from.isEmpty()) {
                continue;
            }
            val to = from
                .stream()
                .flatMap(r -> facts.replacedByFolded().getOrDefault(r, List.of()).stream())
                .distinct()
                .sorted()
                .toList();
            changes.add(new ReplacesChange(entry.where(), entry.element(), from, to));
            if (!entry.where().startsWith("patch ")) {
                rewritten.add(entry.where());
            }
        }
        val stay = tree
            .ids()
            .stream()
            .filter(other -> !other.equals(folded.id()) && !other.equals(into.id()))
            .sorted()
            .toList();
        return new Plan(
            folded.id(),
            into.id(),
            folded.parent() == null ? Plateau.BASELINE : folded.parent(),
            List.copyOf(rewritten),
            folded.manifest() == null ? List.of() : List.of(folded.manifest()),
            folded.patches().size(),
            into.patches().size(),
            List.copyOf(changes),
            stay
        );
    }

    /** The steps that name the plateau, told story by story (sorted by id), step by step, {@code at} before {@code against}. */
    private static String stepsNaming(String id, List<StepNaming> steps) {
        record Mention(int number, int order, String key) {}
        val byStory = new TreeMap<String, List<Mention>>();
        val sources = new TreeMap<String, String>();
        for (val step : steps) {
            val mentions = byStory.computeIfAbsent(step.story(), k -> new ArrayList<>());
            sources.putIfAbsent(step.story(), step.source());
            if (id.equals(step.at())) {
                mentions.add(new Mention(step.number(), 0, "at"));
            }
            if (id.equals(step.against())) {
                mentions.add(new Mention(step.number(), 1, "against"));
            }
        }
        val stories = new ArrayList<String>();
        byStory.forEach((story, mentions) -> {
            if (!mentions.isEmpty()) {
                val told = mentions
                    .stream()
                    .sorted(Comparator.comparingInt(Mention::number).thenComparingInt(Mention::order))
                    .map(m -> "step " + m.number() + " (`" + m.key() + "`)")
                    .toList();
                stories.add("the story `" + story + "` (`" + sources.get(story) + "`) " + listOf(told));
            }
        });
        if (stories.isEmpty()) {
            return "";
        }
        return stories.size() == 1
            ? stories.get(0)
            : stories
                  .stream()
                  .limit(stories.size() - 1L)
                  .collect(Collectors.joining(", ")) +
                  ", and " +
                  stories.get(stories.size() - 1);
    }

    /** {@code a}, {@code a and b}, {@code a, b and c}. */
    static String listOf(List<String> all) {
        if (all.size() == 1) {
            return all.get(0);
        }
        return String.join(", ", all.subList(0, all.size() - 1)) + " and " + all.get(all.size() - 1);
    }
}

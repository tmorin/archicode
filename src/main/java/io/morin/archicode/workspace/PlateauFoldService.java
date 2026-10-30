package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.plateau.Patch;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

/**
 * Reads the facts of a workspace and hands them to {@link Fold} (wave 028, run 0207, issue #65). It reads, and writes
 * nothing; the plateau above the folded one is loaded once, and only for a fold that can be made.
 */
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class PlateauFoldService {

    WorkspaceFactory workspaceFactory;

    /**
     * What folding a plateau into the plateau above it would do.
     *
     * @param workspaceFile the workspace file
     * @param id            the plateau to fold
     * @return the plan
     * @throws io.morin.archicode.ArchiCodeException with the sentence of a refusal, or of the loader
     */
    public Fold.Plan plan(Path workspaceFile, String id) {
        val facts = workspaceFactory.facts(workspaceFile);
        val parsed = facts.parsed();
        val tree = parsed.plateaus();
        val steps = new ArrayList<Fold.StepNaming>();
        for (val placed : parsed.placedStories()) {
            val story = placed.item();
            val list = story.getSteps();
            for (var i = 0; i < list.size(); i++) {
                val step = list.get(i);
                val at = written(step.getAt());
                val against = written(step.getAgainst());
                if (at != null || against != null) {
                    steps.add(new Fold.StepNaming(story.getId(), placed.source(), i + 1, at, against));
                }
            }
        }
        return Fold.plan(id, tree, facts.current(), steps, () ->
            // only called when the plateau has exactly one plateau above it
            composition(workspaceFile, parsed, id, tree.children(id).get(0).id())
        );
    }

    private Fold.Composition composition(Path workspaceFile, ManifestParser.Parsed parsed, String folded, String into) {
        val declared = new LinkedHashMap<String, String>();
        val intoEntries = new ArrayList<Fold.Entry>();
        val candidates = parsed
            .elements()
            .values()
            .stream()
            .flatMap(Set::stream)
            .sorted(
                Comparator.comparing((ManifestParser.Candidate c) ->
                    c.getSource() == null ? "" : c.getSource()
                ).thenComparing(ManifestParser.Candidate::getReference)
            )
            .toList();
        for (val candidate : candidates) {
            if (candidate.getPlateau().equals(folded)) {
                walk(candidate.getReference(), candidate.getElement(), (reference, element) ->
                    declared.put(reference, candidate.getSource())
                );
            } else if (candidate.getPlateau().equals(into)) {
                walk(candidate.getReference(), candidate.getElement(), (reference, element) -> {
                    if (!element.getReplaces().isEmpty()) {
                        intoEntries.add(
                            new Fold.Entry(candidate.getSource(), reference, List.copyOf(element.getReplaces()))
                        );
                    }
                });
            }
        }
        val patches = parsed.plateaus().node(into).patches();
        for (var i = 0; i < patches.size(); i++) {
            val patch = patches.get(i);
            val replaces = replacesSetBy(patch);
            if (!replaces.isEmpty()) {
                val element = patch.hasTarget() ? patch.getTarget() : patch.getJsonPath();
                intoEntries.add(new Fold.Entry("patch " + (i + 1) + " of `" + into + "`", element, replaces));
            }
        }

        // what each element the folded plateau declares replaces once its own patches are applied
        val replaced = new LinkedHashMap<String, List<String>>();
        val loaded = workspaceFactory.create(workspaceFile, null, into);
        loaded
            .getSteps()
            .stream()
            .filter(step -> step.plateau().equals(folded))
            .findFirst()
            .ifPresent(step ->
                declared
                    .keySet()
                    .forEach(reference ->
                        Optional.ofNullable(replacesIn(step, reference)).ifPresent(r -> replaced.put(reference, r))
                    )
            );
        return new Fold.Composition(new TreeSet<>(declared.keySet()), replaced, intoEntries);
    }

    private static List<String> replacesIn(PlateauStep step, String reference) {
        return step
            .application()
            .searchElement(reference)
            .or(() -> step.technology().searchElement(reference))
            .map(element -> List.copyOf(element.getReplaces()))
            .filter(list -> !list.isEmpty())
            .orElse(null);
    }

    private static List<String> replacesSetBy(Patch patch) {
        if (
            patch.getOperator() != Patch.Operator.SET ||
            !"replaces".equals(patch.getField()) ||
            patch.getValue() == null
        ) {
            return List.of();
        }
        val value = patch.getValue();
        val out = new LinkedHashSet<String>();
        if (value.isArray()) {
            for (JsonNode item : value) {
                if (item.isTextual()) {
                    out.add(item.asText());
                }
            }
        } else if (value.isTextual()) {
            out.add(value.asText());
        }
        return List.copyOf(out);
    }

    /** Visits an element and everything nested in it, with the full reference of each. */
    private static void walk(String reference, Element element, java.util.function.BiConsumer<String, Element> visit) {
        visit.accept(reference, element);
        if (element instanceof Parent<?> parent) {
            for (Element child : parent.getElements()) {
                walk(reference + "." + child.getId(), child, visit);
            }
        }
    }

    private static String written(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}

package io.morin.archicode.workspace;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.manifest.ManifestKind;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Nesting;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.element.technology.TechnologyElement;
import io.morin.archicode.resource.workspace.Workspace;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class ElementIndexFactory {

    @NonNull
    Parent<?> root;

    @NonNull
    ElementIndex index = ElementIndex.builder().build();

    @NonNull
    Set<ManifestParser.Candidate> candidates;

    private void reindexAncestors(String reference) {
        Workspace.Utilities.findParentReference(reference).ifPresent(parentReference -> {
            val removedElement = index.elementByReferenceIndex.remove(parentReference);
            if (removedElement == null) {
                // a reference that is not made of elements (an id with a dot, issue #104): there is nothing to index above it
                return;
            }
            log.debug("reindex {} {} {}", parentReference, removedElement, removedElement.hashCode());
            index.elementByReferenceIndex.put(parentReference, removedElement);
            index.referenceByElementIndex.put(removedElement, parentReference);
            reindexAncestors(parentReference);
        });
    }

    /** The two indexes of a workspace: the elements of the application layer and of the technology layer. */
    public record Layers(ElementIndex application, ElementIndex technology) {}

    /**
     * Index the two layers of a workspace, adding the elements the manifests declare. The mistakes of the two layers are told
     * together (the application layer first), not the mistakes of one and then, once they are repaired, those of the other.
     *
     * @param resources  the workspace; its trees are changed (the candidates are added to their parents)
     * @param candidates the elements the manifests declare, by layer ({@code Application.class}, {@code Technology.class})
     * @return the two indexes
     * @throws ArchiCodeException with one line for each element declared under a parent that cannot hold its kind
     */
    public static Layers indexLayers(Workspace resources, Map<Class<?>, Set<ManifestParser.Candidate>> candidates) {
        val mistakes = new ArrayList<String>();
        ElementIndex application = null;
        ElementIndex technology = null;
        try {
            application = ElementIndexFactory.builder()
                .root(resources.getApplication())
                .candidates(candidates.getOrDefault(Application.class, Set.of()))
                .build()
                .create();
        } catch (ArchiCodeException e) {
            mistakes.add(e.getMessage());
        }
        try {
            technology = ElementIndexFactory.builder()
                .root(resources.getTechnology())
                .candidates(candidates.getOrDefault(Technology.class, Set.of()))
                .build()
                .create();
        } catch (ArchiCodeException e) {
            mistakes.add(e.getMessage());
        }
        if (!mistakes.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", mistakes));
        }
        return new Layers(application, technology);
    }

    private static boolean holds(Element parent, ManifestParser.Candidate candidate) {
        return Nesting.holds(parent, candidate.getElement());
    }

    /**
     * The sentence for an element declared under a parent that cannot hold its kind: the one the reader of the files says for
     * a nested element of a kind its parent does not hold ({@code unknown kind `x` (known: ...) at `path`}), with the file, the
     * parent and the place of the fault in the manifest.
     */
    private static String refusal(ManifestParser.Candidate candidate, Element parent) {
        val kinds = Nesting.kindsHeldBy(parent);
        return String.format(
            "`%s` is not valid: unknown kind `%s` under `%s` (known: %s) at `header.kind`",
            candidate.getSource(),
            Arrays.stream(ManifestKind.values())
                .filter(k -> k.getType() == candidate.getElement().getClass())
                .findFirst()
                .map(ManifestKind::getSubTypeName)
                .orElse(candidate.getElement().getClass().getSimpleName().toLowerCase(Locale.ROOT)),
            candidate.getParent(),
            kinds.isEmpty() ? "none" : String.join(", ", kinds)
        );
    }

    @SuppressWarnings({ "unchecked", "java:S6880" })
    public ElementIndex create() {
        log.debug("index the elements of the resources {}", root);

        if (root instanceof Application application) {
            Workspace.Utilities.walkDown(application, (parent, element) ->
                ElementIndexUtilities.index(parent, element, index)
            );
        } else if (root instanceof Technology technology) {
            Workspace.Utilities.walkDown(technology, (parent, element) ->
                ElementIndexUtilities.index(parent, element, index)
            );
        } else {
            throw new IllegalStateException("root must be Application or Technology");
        }

        log.debug("index the elements discovered in the manifests");
        val indexedCandidates = new HashSet<ManifestParser.Candidate>();
        for (val candidate : candidates) {
            ElementIndexUtilities.index(candidate, index);
            Workspace.Utilities.walkDown(candidate.getElement(), (parent, element) ->
                ElementIndexUtilities.index(parent, element, index)
            );
            indexedCandidates.add(candidate);
        }
        indexedCandidates.forEach(appCandidate -> log.debug("indexAppCandidate {}", appCandidate));

        log.debug("register the elements discovered in the manifests");
        // an element is added to its parent only if the parent holds its kind (issue #87): a mistake is told with the file, and the
        // mistakes of a layer together, by reference (the candidates are a set, it has no order)
        val refused = new TreeMap<String, String>();
        indexedCandidates.forEach(appCandidate -> {
            val parentCandidate = index.elementByReferenceIndex.get(appCandidate.getParent());
            if (parentCandidate != null && appCandidate.getSource() != null && !holds(parentCandidate, appCandidate)) {
                refused.put(appCandidate.getReference(), refusal(appCandidate, parentCandidate));
            } else if (parentCandidate instanceof Parent parent) {
                parent.getElements().add(appCandidate.getElement());
                reindexAncestors(appCandidate.getReference());
            } else if (
                appCandidate.getElement() instanceof ApplicationElement applicationElement &&
                root instanceof Application application
            ) {
                application.getElements().add(applicationElement);
            } else if (
                appCandidate.getElement() instanceof TechnologyElement technologyElement &&
                root instanceof Technology technology
            ) {
                technology.getElements().add(technologyElement);
            }
        });

        if (!refused.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", refused.values()));
        }

        log.info(
            "{} - size of elementByReferenceIndex : {}",
            root.getClass().getSimpleName(),
            index.elementByReferenceIndex.size()
        );
        log.info(
            "{} - size of referenceByElementIndex : {}",
            root.getClass().getSimpleName(),
            index.referenceByElementIndex.size()
        );
        log.info(
            "{} - size of sourceElementsByDestinationIndex : {}",
            root.getClass().getSimpleName(),
            index.sourceElementsByDestinationIndex.size()
        );
        return index;
    }
}

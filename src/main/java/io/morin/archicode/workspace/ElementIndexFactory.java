package io.morin.archicode.workspace;

import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.deployment.Deployment;
import io.morin.archicode.resource.element.deployment.DeploymentElement;
import io.morin.archicode.resource.workspace.Workspace;
import java.util.HashSet;
import java.util.Set;
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

    public ElementIndex create() {
        log.debug("index the  elements of the resources");

        if (root instanceof Application application) {
            Workspace.Utilities.walkDown(
                application,
                (parent, element) -> ElementIndexUtilities.index(parent, element, index)
            );
        } else if (root instanceof Deployment deployment) {
            log.debug("index the elements of the resources");
            Workspace.Utilities.walkDown(
                deployment,
                (parent, element) -> ElementIndexUtilities.index(parent, element, index)
            );
        } else {
            throw new IllegalStateException("root must be Application or Deployment");
        }

        log.debug("index the elements discovered in the manifests");
        val indexedCandidates = new HashSet<ManifestParser.Candidate>();
        for (val candidate : candidates) {
            ElementIndexUtilities.index(candidate, index);
            Workspace.Utilities.walkDown(
                candidate.getElement(),
                (parent, element) -> ElementIndexUtilities.index(parent, element, index)
            );
            indexedCandidates.add(candidate);
        }
        indexedCandidates.forEach(appCandidate -> log.debug("indexAppCandidate {}", appCandidate));

        log.debug("register the elements discovered in the manifests");
        indexedCandidates.forEach(appCandidate -> {
            val parentCandidate = index.elementByReferenceIndex.get(appCandidate.getParent());
            if (parentCandidate instanceof Parent parent) {
                index.referenceByElementIndex.remove(index.elementByReferenceIndex.remove(appCandidate.getParent()));
                parent.getElements().add(appCandidate.getElement());
                index.elementByReferenceIndex.put(appCandidate.getParent(), parentCandidate);
                index.referenceByElementIndex.put(parentCandidate, appCandidate.getParent());
            } else if (parentCandidate instanceof ApplicationElement applicationElement) {
                if (root instanceof Application application) {
                    application.getElements().add(applicationElement);
                }
            } else if (parentCandidate instanceof DeploymentElement deploymentElement) {
                if (root instanceof Deployment deployment) {
                    deployment.getElements().add(deploymentElement);
                }
            }
        });

        return index;
    }
}

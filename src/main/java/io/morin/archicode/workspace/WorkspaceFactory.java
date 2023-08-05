package io.morin.archicode.workspace;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.ApplicationElement;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.util.*;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class WorkspaceFactory {

    MapperFactory mapperFactory;
    ManifestParser manifestParser;

    private static void index(ManifestParser.Candidate appCandidate, ElementIndex appElementIndex) {
        Optional
            .ofNullable(appCandidate.getParent())
            .ifPresentOrElse(
                p -> {
                    val elementReference = appCandidate.getReference();
                    val element = appCandidate.getElement();

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = appCandidate.getReference();
                    val element = appCandidate.getElement();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(appCandidate.getElement().getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                appElementIndex.sourceElementsByDestinationIndex.putIfAbsent(
                    relationship.getDestination(),
                    new HashSet<>()
                );
                appElementIndex.sourceElementsByDestinationIndex
                    .get(relationship.getDestination())
                    .add(appCandidate.getElement());
            });
    }

    private static void index(Element parent, Element element, ElementIndex appElementIndex) {
        Optional
            .ofNullable(parent)
            .ifPresentOrElse(
                p -> {
                    val parentReference = appElementIndex.referenceByElementIndex.get(p);
                    val elementReference = String.format("%s.%s", parentReference, element.getId());

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = element.getId();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    appElementIndex.elementByReferenceIndex.put(elementReference, element);
                    appElementIndex.referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(element.getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                appElementIndex.sourceElementsByDestinationIndex.putIfAbsent(
                    relationship.getDestination(),
                    new HashSet<>()
                );
                appElementIndex.sourceElementsByDestinationIndex.get(relationship.getDestination()).add(element);
            });
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(
        Workspace workspace,
        Map<Class<?>, Set<ManifestParser.Candidate>> manifests
    ) {
        val appIndex = ElementIndex.builder().build();

        log.debug("index the elements of the resources");
        Workspace.Utilities.walkDown(workspace.getApplication(), (parent, element) -> index(parent, element, appIndex));

        log.debug("index the elements discovered in the manifests");
        val appCandidates = manifests.getOrDefault(Application.class, Set.of());
        val indexedAppCandidates = new HashSet<ManifestParser.Candidate>();
        for (val appCandidate : appCandidates) {
            index(appCandidate, appIndex);
            Workspace.Utilities.walkDown(
                appCandidate.getElement(),
                (parent, element) -> index(parent, element, appIndex)
            );
            indexedAppCandidates.add(appCandidate);
        }
        indexedAppCandidates.forEach(appCandidate -> log.debug("indexAppCandidate {}", appCandidate));

        log.debug("register the elements discovered in the manifests");
        indexedAppCandidates.forEach(appCandidate -> {
            val parentCandidate = appIndex.elementByReferenceIndex.get(appCandidate.getParent());
            if (parentCandidate instanceof Parent parent) {
                appIndex.referenceByElementIndex.remove(
                    appIndex.elementByReferenceIndex.remove(appCandidate.getParent())
                );
                parent.getElements().add(appCandidate.getElement());
                appIndex.elementByReferenceIndex.put(appCandidate.getParent(), parentCandidate);
                appIndex.referenceByElementIndex.put(parentCandidate, appCandidate.getParent());
            } else if (parentCandidate instanceof ApplicationElement applicationElement) {
                workspace.getApplication().getElements().add(applicationElement);
            }
        });

        log.debug("index the views of the resources");
        val viewIndex = ViewIndex.builder().build();
        workspace.getViews().forEach(view -> viewIndex.viewByViewIdIndex.put(view.getViewId(), view));

        return io.morin.archicode.workspace.Workspace
            .builder()
            .resources(workspace)
            .appIndex(appIndex)
            .viewIndex(viewIndex)
            .build();
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path) {
        log.info("parse the resources {}", path);

        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
        val rawWorkspace = workspaceMapper.readValue(path.toFile(), Workspace.class);

        // parse the manifests
        val manifestsPath = Path.of(
            path.toFile().getParentFile().toPath().toString(),
            rawWorkspace.getSettings().getManifests().getPath()
        );

        val manifests = manifestParser.parse(manifestsPath);

        return create(rawWorkspace, manifests);
    }
}

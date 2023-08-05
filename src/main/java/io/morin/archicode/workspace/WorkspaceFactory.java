package io.morin.archicode.workspace;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.element.Element;
import io.morin.archicode.element.application.Application;
import io.morin.archicode.element.application.ApplicationElement;
import io.morin.archicode.element.application.Parent;
import io.morin.archicode.manifest.Candidate;
import io.morin.archicode.manifest.ResourceParser;
import io.morin.archicode.view.View;
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
    ResourceParser resourceParser;

    @SneakyThrows
    public Workspace create(RawWorkspace rawWorkspace, Map<Class<?>, Set<Candidate>> manifests) {
        val sourceElementsByDestinationIndex = new HashMap<String, Set<Element>>();
        val elementByReferenceIndex = new HashMap<String, Element>();
        val referenceByElementIndex = new HashMap<Element, String>();

        Workspace.Utilities.walkDown(
            rawWorkspace.getApplication(),
            (parent, element) ->
                index(
                    parent,
                    element,
                    referenceByElementIndex,
                    elementByReferenceIndex,
                    sourceElementsByDestinationIndex
                )
        );

        // index the Application candidates
        val appCandidates = manifests.getOrDefault(Application.class, Set.of());
        val indexedAppCandidates = new HashSet<Candidate>();
        for (val appCandidate : appCandidates) {
            index(
                appCandidate,
                elementByReferenceIndex,
                referenceByElementIndex,
                sourceElementsByDestinationIndex,
                indexedAppCandidates
            );
            Workspace.Utilities.walkDown(
                appCandidate.getElement(),
                (parent, element) ->
                    index(
                        parent,
                        element,
                        referenceByElementIndex,
                        elementByReferenceIndex,
                        sourceElementsByDestinationIndex
                    )
            );
        }
        indexedAppCandidates.forEach(appCandidate -> log.info("indexAppCandidate {}", appCandidate));

        // register the application candidate in the Application model
        indexedAppCandidates.forEach(appCandidate -> {
            log.info("appCandidate {}", appCandidate);
            val element = elementByReferenceIndex.get(appCandidate.getReference());
            if (elementByReferenceIndex.get(appCandidate.getParent()) instanceof Parent parent) {
                parent.getElements().add(element);
            } else if (element instanceof ApplicationElement applicationElement) {
                rawWorkspace.getApplication().getElements().add(applicationElement);
            }
        });

        val viewByViewIdIndex = new HashMap<String, View>();
        rawWorkspace.getViews().forEach(view -> viewByViewIdIndex.put(view.getViewId(), view));

        return Workspace
            .builder()
            .rawWorkspace(rawWorkspace)
            .sourceElementsByDestinationIndex(sourceElementsByDestinationIndex)
            .elementByReferenceIndex(elementByReferenceIndex)
            .referenceByElementIndex(referenceByElementIndex)
            .viewByViewIdIndex(viewByViewIdIndex)
            .build();
    }

    private static void index(
        Candidate appCandidate,
        HashMap<String, Element> elementByReferenceIndex,
        HashMap<Element, String> referenceByElementIndex,
        HashMap<String, Set<Element>> sourceElementsByDestinationIndex,
        HashSet<Candidate> indexedAppCandidates
    ) {
        Optional
            .ofNullable(appCandidate.getParent())
            .ifPresentOrElse(
                p -> {
                    val elementReference = appCandidate.getReference();
                    elementByReferenceIndex.put(elementReference, appCandidate.getElement());
                    referenceByElementIndex.put(appCandidate.getElement(), elementReference);
                },
                () -> {
                    elementByReferenceIndex.put(appCandidate.getElement().getId(), appCandidate.getElement());
                    referenceByElementIndex.put(appCandidate.getElement(), appCandidate.getElement().getId());
                }
            );
        Optional
            .ofNullable(appCandidate.getElement().getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                sourceElementsByDestinationIndex.putIfAbsent(relationship.getDestination(), new HashSet<>());
                sourceElementsByDestinationIndex.get(relationship.getDestination()).add(appCandidate.getElement());
            });
        indexedAppCandidates.add(appCandidate);
    }

    private static void index(
        Element parent,
        Element element,
        HashMap<Element, String> referenceByElementIndex,
        HashMap<String, Element> elementByReferenceIndex,
        HashMap<String, Set<Element>> sourceElementsByDestinationIndex
    ) {
        Optional
            .ofNullable(parent)
            .ifPresentOrElse(
                p -> {
                    val parentReference = referenceByElementIndex.get(p);
                    val elementReference = String.format("%s.%s", parentReference, element.getId());
                    elementByReferenceIndex.put(elementReference, element);
                    referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    elementByReferenceIndex.put(element.getId(), element);
                    referenceByElementIndex.put(element, element.getId());
                }
            );
        Optional
            .ofNullable(element.getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                sourceElementsByDestinationIndex.putIfAbsent(relationship.getDestination(), new HashSet<>());
                sourceElementsByDestinationIndex.get(relationship.getDestination()).add(element);
            });
    }

    @SneakyThrows
    public Workspace create(Path path) {
        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
        val rawWorkspace = workspaceMapper.readValue(path.toFile(), RawWorkspace.class);

        // parse the manifests
        val manifestsPath = Path.of(
            path.toFile().getParentFile().toPath().toString(),
            rawWorkspace.getSettings().getManifests().getPath()
        );
        val manifests = resourceParser.parse(manifestsPath);

        return create(rawWorkspace, manifests);
    }
}

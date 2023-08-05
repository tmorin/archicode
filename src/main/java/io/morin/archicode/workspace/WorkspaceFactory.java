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

    private static void index(
        Candidate appCandidate,
        HashMap<String, Element> elementByReferenceIndex,
        HashMap<Element, String> referenceByElementIndex,
        HashMap<String, Set<Element>> sourceElementsByDestinationIndex
    ) {
        Optional
            .ofNullable(appCandidate.getParent())
            .ifPresentOrElse(
                p -> {
                    val elementReference = appCandidate.getReference();
                    val element = appCandidate.getElement();

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    elementByReferenceIndex.put(elementReference, element);
                    referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = appCandidate.getReference();
                    val element = appCandidate.getElement();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    elementByReferenceIndex.put(elementReference, element);
                    referenceByElementIndex.put(element, elementReference);
                }
            );
        Optional
            .ofNullable(appCandidate.getElement().getRelationships())
            .orElse(Collections.emptySet())
            .forEach(relationship -> {
                sourceElementsByDestinationIndex.putIfAbsent(relationship.getDestination(), new HashSet<>());
                sourceElementsByDestinationIndex.get(relationship.getDestination()).add(appCandidate.getElement());
            });
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

                    log.debug("index (p) {} {} {}", elementReference, element, element.hashCode());
                    elementByReferenceIndex.put(elementReference, element);
                    referenceByElementIndex.put(element, elementReference);
                },
                () -> {
                    val elementReference = element.getId();

                    log.debug("index (r) {} {} {}", elementReference, element, element.hashCode());
                    elementByReferenceIndex.put(elementReference, element);
                    referenceByElementIndex.put(element, elementReference);
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
    public Workspace create(RawWorkspace rawWorkspace, Map<Class<?>, Set<Candidate>> manifests) {
        val sourceElementsByDestinationIndex = new HashMap<String, Set<Element>>();
        val elementByReferenceIndex = new HashMap<String, Element>();
        val referenceByElementIndex = new HashMap<Element, String>();

        log.debug("index the elements of the workspace");
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

        log.debug("index the elements discovered in the manifests");
        val appCandidates = manifests.getOrDefault(Application.class, Set.of());
        val indexedAppCandidates = new HashSet<Candidate>();
        for (val appCandidate : appCandidates) {
            index(appCandidate, elementByReferenceIndex, referenceByElementIndex, sourceElementsByDestinationIndex);
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
            indexedAppCandidates.add(appCandidate);
        }
        indexedAppCandidates.forEach(appCandidate -> log.debug("indexAppCandidate {}", appCandidate));

        log.debug("register the elements discovered in the manifests");
        indexedAppCandidates.forEach(appCandidate -> {
            val parentCandidate = elementByReferenceIndex.get(appCandidate.getParent());
            if (parentCandidate instanceof Parent parent) {
                referenceByElementIndex.remove(elementByReferenceIndex.remove(appCandidate.getParent()));
                parent.getElements().add(appCandidate.getElement());
                elementByReferenceIndex.put(appCandidate.getParent(), parentCandidate);
                referenceByElementIndex.put(parentCandidate, appCandidate.getParent());
            } else if (parentCandidate instanceof ApplicationElement applicationElement) {
                rawWorkspace.getApplication().getElements().add(applicationElement);
            }
        });

        log.debug("index the views of the workspace");
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

    @SneakyThrows
    public Workspace create(Path path) {
        log.info("parse the workspace {}", path);

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

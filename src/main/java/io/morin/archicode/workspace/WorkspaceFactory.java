package io.morin.archicode.workspace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.util.RawValue;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.workspace.Settings.Facets.Facet;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
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
    Warnings warnings;

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(
        Workspace resources,
        Map<Class<?>, Set<ManifestParser.Candidate>> manifests
    ) {
        log.debug("index the application elements");
        val appIndex = ElementIndexFactory.builder()
            .root(resources.getApplication())
            .candidates(manifests.getOrDefault(Application.class, Set.of()))
            .build()
            .create();

        log.debug("index the technology elements");
        val depIndex = ElementIndexFactory.builder()
            .root(resources.getTechnology())
            .candidates(manifests.getOrDefault(Technology.class, Set.of()))
            .build()
            .create();

        log.debug("index the views");
        val viewIndex = ViewIndexFactory.builder().views(resources.getViews()).build().create();

        resources.getStories().forEach(story ->
            story
                .getSteps()
                .stream()
                .filter(step -> step.getView() != null && viewIndex.searchView(step.getView()).isEmpty())
                .forEach(step ->
                    warnings.warn(
                        "the story `%s` has a step on the view `%s`, which is not declared",
                        story.getId(),
                        step.getView()
                    )
                )
        );

        return io.morin.archicode.workspace.Workspace.builder()
            .resources(resources)
            .appIndex(appIndex)
            .techIndex(depIndex)
            .viewIndex(viewIndex)
            .build();
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path) {
        return create(path, null);
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path, Path viewsDirPath) {
        return create(path, viewsDirPath, null);
    }

    /**
     * Read a workspace file and its manifests.
     *
     * @param path         the workspace file
     * @param viewsDirPath the folder the views are written to, or null for the one of the settings. For a workspace
     *                     that has plateaus, it is the beginning of the name of the folder of each plateau (see below)
     * @param plateauId    the plateau to read ({@code --plateau}), or null for {@code settings.current}, else the last
     *                     one of {@code settings.plateaus}; it must be null for a workspace that has no plateaus
     */
    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path, Path viewsDirPath, String plateauId) {
        val loaded = load(path, viewsDirPath, plateauId);
        return create(loaded.resources(), loaded.elements())
            .toBuilder()
            .plateau(loaded.selection() == null ? null : loaded.selection().plateau())
            .build();
    }

    /**
     * Read the plateau {@code plateauId} again, holding in addition what only the baseline had, so that the views of the
     * comparison can draw it: the elements the comparison calls removed, each with what it holds, under its parent. The
     * plateau is read afresh, so that nothing merged here shows in the workspace the plain views are drawn from.
     *
     * @param path         the workspace file
     * @param viewsDirPath the folder the views are written to, as for {@link #create(Path, Path, String)}
     * @param plateauId    the plateau that is compared
     * @param base         the baseline, loaded on its own: where the removed elements are taken from
     * @param comparison   what {@code base} and the plateau do not share
     * @return the workspace of the plateau and the removed elements of the baseline
     */
    @SneakyThrows
    public io.morin.archicode.workspace.Workspace createUnion(
        Path path,
        Path viewsDirPath,
        String plateauId,
        io.morin.archicode.workspace.Workspace base,
        Comparison comparison
    ) {
        val loaded = load(path, viewsDirPath, plateauId);
        val manifests = new HashMap<Class<?>, Set<ManifestParser.Candidate>>();
        loaded.elements().forEach((category, candidates) -> manifests.put(category, new HashSet<>(candidates)));
        val mapper = mapperFactory.create(MapperFormat.JSON);
        addRemoved(manifests, Application.class, "application", base.appIndex, comparison, mapper);
        addRemoved(manifests, Technology.class, "technology", base.techIndex, comparison, mapper);
        return create(loaded.resources(), manifests)
            .toBuilder()
            .plateau(loaded.selection() == null ? null : loaded.selection().plateau())
            .baseline(base.getPlateau())
            .build();
    }

    /**
     * The elements of a layer that only the baseline has, as candidates: the ones whose parent is not removed too (a
     * removed parent brings its removed children with it). What such an element held that the comparison does not have
     * (a child that another element replaced, which is in no view of the comparison) is left behind: the workspace of the
     * comparison holds the union and nothing else.
     */
    @SneakyThrows
    private static void addRemoved(
        Map<Class<?>, Set<ManifestParser.Candidate>> manifests,
        Class<?> category,
        String layer,
        ElementIndex baseIndex,
        Comparison comparison,
        ObjectMapper mapper
    ) {
        val removed = new TreeSet<String>();
        comparison
            .getElements()
            .stream()
            .filter(e -> e.layer().equals(layer) && e.change() == Change.REMOVED)
            .forEach(e -> removed.add(e.reference()));
        for (val reference : removed) {
            val parent = io.morin.archicode.resource.workspace.Workspace.Utilities.findParentReference(reference);
            if (parent.isPresent() && removed.contains(parent.get())) {
                continue;
            }
            manifests
                .computeIfAbsent(category, c -> new HashSet<>())
                .add(
                    ManifestParser.Candidate.builder()
                        .parent(parent.orElse(null))
                        .reference(reference)
                        .element(
                            onlyWhatIsRemoved(baseIndex.getElementByReference(reference), reference, removed, mapper)
                        )
                        .build()
                );
        }
    }

    /** Whether an element holds, at any depth, an element that is not among {@code kept}. */
    private static boolean holdsOthers(Element element, String reference, Set<String> kept) {
        if (!(element instanceof Parent<?> parent)) {
            return false;
        }
        return parent
            .getElements()
            .stream()
            .anyMatch(child -> {
                val childReference = reference + "." + child.getId();
                return !kept.contains(childReference) || holdsOthers(child, childReference, kept);
            });
    }

    /**
     * The element, as it is when it holds only elements of {@code kept} (the very object of the baseline: nothing is copied
     * for the usual case, a removed element that holds only removed ones); else a copy without the others, so that the
     * baseline is not changed.
     */
    @SneakyThrows
    private static Element onlyWhatIsRemoved(Element element, String reference, Set<String> kept, ObjectMapper mapper) {
        if (!holdsOthers(element, reference, kept)) {
            return element;
        }
        val tree = (ObjectNode) mapper.valueToTree(element);
        leaveOut(tree, reference, kept);
        return mapper.treeToValue(tree, element.getClass());
    }

    private static void leaveOut(ObjectNode node, String reference, Set<String> kept) {
        if (!node.path("elements").isArray()) {
            return;
        }
        val children = (ArrayNode) node.get("elements");
        for (int i = children.size() - 1; i >= 0; i--) {
            val child = (ObjectNode) children.get(i);
            val childReference = reference + "." + child.path("id").asText();
            if (kept.contains(childReference)) {
                leaveOut(child, childReference, kept);
            } else {
                children.remove(i);
            }
        }
    }

    /**
     * The same workspace, whose views are written to another folder.
     *
     * @param workspace the workspace
     * @param viewsPath the folder, relative to the folder of the workspace file, or absolute
     * @return the workspace; its indices are the ones of {@code workspace}
     */
    public io.morin.archicode.workspace.Workspace withViewsPath(
        io.morin.archicode.workspace.Workspace workspace,
        String viewsPath
    ) {
        return workspace
            .toBuilder()
            .resources(
                workspace
                    .getResources()
                    .toBuilder()
                    .settings(
                        workspace
                            .getSettings()
                            .toBuilder()
                            .views(workspace.getSettings().getViews().toBuilder().path(viewsPath).build())
                            .build()
                    )
                    .build()
            )
            .build();
    }

    /** What a plateau (or the manifests) is made of, before it is indexed. */
    private record Loaded(
        Workspace resources,
        Map<Class<?>, Set<ManifestParser.Candidate>> elements,
        Plateaus.Selection selection
    ) {}

    @SneakyThrows
    private Loaded load(Path path, Path viewsDirPath, String plateauId) {
        log.info("parse the resources {}", path);

        if (!Files.isRegularFile(path)) {
            throw new ArchiCodeException("the workspace file `%s` does not exist (`-w` names another one)", path);
        }

        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
        // what the author wrote: the plateaus are checked on it, and so is whether `manifests.paths` is written (its
        // default is not, and does not count)
        final JsonNode tree;
        final Workspace rawWorkspace;
        try {
            tree = workspaceMapper.readTree(path.toFile());
            val structure = Plateaus.checkStructure(tree.path("settings").path("plateaus"));
            if (!structure.isEmpty()) {
                throw new ArchiCodeException("%s", String.join("\n", structure));
            }
            rawWorkspace = workspaceMapper.readValue(path.toFile(), Workspace.class);
        } catch (JsonProcessingException e) {
            throw ArchiCodeException.unreadable(path.getFileName().toString(), e, true);
        }
        val manifestsPathsWritten = tree.path("settings").path("manifests").has("paths");

        // the plateau to read; none for a workspace that has one set of manifests (manifests.paths)
        val wksDir = path.toFile().getParentFile().toPath();
        val selection = Plateaus.select(rawWorkspace.getSettings(), manifestsPathsWritten, plateauId);

        // The folder of the views. With plateaus, each plateau has its own, named after it (`views-to-be`, or `out-to-be`
        // for `--output out`), so that drawing two plateaus does not overwrite one with the other; without plateaus it is
        // the folder it has always been.
        val viewsPath = Optional.ofNullable(viewsDirPath)
            .map(Path::toString)
            .orElseGet(() -> rawWorkspace.getSettings().getViews().getPath());
        val plateauViewsPath = selection == null ? viewsPath : viewsPath + "-" + selection.plateau().getId();
        val fixedRawWorkspace =
            viewsDirPath == null && selection == null
                ? rawWorkspace
                : rawWorkspace
                      .toBuilder()
                      .settings(
                          rawWorkspace
                              .getSettings()
                              .toBuilder()
                              .views(rawWorkspace.getSettings().getViews().toBuilder().path(plateauViewsPath).build())
                              .build()
                      )
                      .build();

        val manifestsDirs =
            selection == null
                ? fixedRawWorkspace.getSettings().getManifests().getPaths()
                : Set.of(selection.path().isEmpty() ? "." : selection.path());
        if (selection != null && !wksDir.resolve(manifestsDirs.iterator().next()).toFile().isDirectory()) {
            throw new ArchiCodeException(
                "the folder `%s` of the plateau `%s` does not exist",
                selection.path(),
                selection.plateau().getId()
            );
        }
        if (selection != null) {
            log.info("read the plateau {} from {}", selection.plateau().getId(), selection.path());
        }

        // parse the manifests: the elements, and the views and the stories that are manifests of their own, which join
        // the ones of workspace.yaml. One call per plateau: a reference declared twice is an error inside a plateau,
        // and the same reference in two plateaus is the very point of having two
        val manifests = manifestParser.parse(wksDir, manifestsDirs, path);

        return new Loaded(
            fixedRawWorkspace.toBuilder().views(manifests.views()).stories(manifests.stories()).build(),
            manifests.elements(),
            selection
        );
    }

    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(
        io.morin.archicode.workspace.Workspace workspace,
        Facet facet
    ) {
        return create(workspace, facet, null);
    }

    /**
     * Apply a facet to the workspace of a comparison (see {@link #createUnion}): the facet reads the JSON of the workspace
     * with {@code change} in every element and relationship, and the relationships that only the baseline had.
     *
     * @param workspace  the workspace the facet is applied to
     * @param facet      the facet
     * @param comparison what changed between the two plateaus {@code workspace} is the union of, or null for a workspace
     *                   that compares nothing (the facet is then applied as it always was)
     */
    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(
        io.morin.archicode.workspace.Workspace workspace,
        Facet facet,
        Comparison comparison
    ) {
        log.info("process {}", facet);

        val jsonMapper = mapperFactory.create(MapperFormat.JSON);
        val refWorkspaceAsJson = jsonMapper.writeValueAsString(workspace);
        val facetRawWorkspace = jsonMapper
            .readValue(refWorkspaceAsJson, Workspace.class)
            .toBuilder()
            .settings(
                workspace
                    .getSettings()
                    .toBuilder()
                    .views(
                        workspace
                            .getSettings()
                            .getViews()
                            .toBuilder()
                            .path(
                                String.format(
                                    workspace.getSettings().getFacets().getDirectoryNameTemplate(),
                                    workspace.getSettings().getViews().getPath(),
                                    facet.getName()
                                )
                            )
                            .build()
                    )
                    .build()
            )
            .build();
        var facetRawWorkspaceAsJson = jsonMapper.writeValueAsString(facetRawWorkspace);
        if (comparison != null) {
            val document = (ObjectNode) jsonMapper.readTree(facetRawWorkspaceAsJson);
            ComparisonDocument.inject(document, comparison);
            facetRawWorkspaceAsJson = jsonMapper.writeValueAsString(document);
        }

        val request = jsonMapper.createObjectNode();
        // the workspace goes to the kernel as it is written: it is not parsed just to be written again
        request.putRawValue("workspace", new RawValue(facetRawWorkspaceAsJson));
        val actions = request.putArray("actions");
        for (val action : facet.getActions()) {
            log.info("process {}", action);
            val node = actions.addObject();
            node.put("operator", action.getOperator().name());
            node.put("json_path", action.getJsonPath());
        }

        // the facets are evaluated by the viewpoint kernel, the very code the editor runs
        val answer = jsonMapper.readTree(
            ViewpointKernel.getInstance().applyFacet(jsonMapper.writeValueAsString(request))
        );
        if (answer.has("error")) {
            throw new ArchiCodeException("facet %s: %s", facet.getName(), answer.get("error").asText());
        }
        if (answer.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, expected %s",
                answer.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }
        answer.path("warnings").forEach(warning -> warnings.warn("facet %s: %s", facet.getName(), warning.asText()));

        if (comparison != null) {
            ComparisonDocument.strip(answer.get("workspace"));
        }
        val facetWorkspace = jsonMapper.treeToValue(answer.get("workspace"), Workspace.class);

        return create(facetWorkspace, Map.of())
            .toBuilder()
            .faceted(true)
            .hideUnlinked(facet.isHideUnlinked())
            .plateau(workspace.getPlateau())
            .baseline(workspace.getBaseline())
            .build();
    }
}

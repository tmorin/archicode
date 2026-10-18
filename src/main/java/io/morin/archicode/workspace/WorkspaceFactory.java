package io.morin.archicode.workspace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import io.morin.archicode.resource.plateau.PlateauTree;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
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
    LayerLoader layerLoader;
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
     *                     one of {@code settings.plateaus}, or of layered plateaus when they form one line; it must be
     *                     null for a workspace that has no plateaus
     */
    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path, Path viewsDirPath, String plateauId) {
        val loaded = load(path, viewsDirPath, plateauId);
        return create(loaded.resources(), loaded.elements())
            .toBuilder()
            .plateau(loaded.selection() == null ? null : loaded.selection().plateau())
            .plateauTree(loaded.tree())
            .removals(loaded.removals())
            .build();
    }

    /**
     * The plateaus of a workspace that has layered plateaus, and how they stack. A workspace without plateaus has
     * {@code baseline} alone.
     *
     * @param path the workspace file
     * @return the tree of the plateaus
     * @throws ArchiCodeException when the workspace has {@code settings.plateaus} (the plateaus are then not layers), or
     *                            when a manifest or the tree of the plateaus is wrong
     */
    @SneakyThrows
    public PlateauTree plateauTree(Path path) {
        val source = read(path);
        val plateaus = source.rawWorkspace().getSettings().getPlateaus();
        if (plateaus != null && !plateaus.isEmpty()) {
            throw new ArchiCodeException(
                "this workspace lists its plateaus in `settings.plateaus`, which are not layers: `plateau list` lists the plateaus of a workspace whose manifests say `plateau: <id>` (the plateaus here are %s)",
                plateaus
                    .stream()
                    .map(p -> "`" + p.getId() + "`")
                    .collect(Collectors.joining(", "))
            );
        }
        val settings = source.rawWorkspace().getSettings();
        Plateaus.select(settings, source.manifestsPathsWritten(), null);
        val parsed = parse(path, source, settings.getManifests().getPaths(), true);
        if (!parsed.plateaus().isLayered()) {
            Plateaus.requireNoPlateaus(settings, null);
        }
        return parsed.plateaus();
    }

    /** Read the manifests of the folders, and tell the warnings of the tree of the plateaus they write. */
    private ManifestParser.Parsed parse(Path path, Source source, Set<String> manifestsDirs, boolean layersAllowed) {
        val parsed = manifestParser.parse(
            source.wksDir(),
            manifestsDirs,
            path,
            source.rawWorkspace().getSettings().getViews().getPath(),
            layersAllowed
        );
        warnings.warnAll(parsed.plateaus().warnings());
        return parsed;
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
        addRemoved(manifests, Application.class, "application", base.appIndex, comparison);
        addRemoved(manifests, Technology.class, "technology", base.techIndex, comparison);
        return create(loaded.resources(), manifests)
            .toBuilder()
            .plateau(loaded.selection() == null ? null : loaded.selection().plateau())
            .plateauTree(loaded.tree())
            .removals(loaded.removals())
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
        Comparison comparison
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
                        .element(onlyWhatIsRemoved(baseIndex.getElementByReference(reference), reference, removed))
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
     * baseline is not changed. The copy is made by the classes themselves ({@link Parent#withElements}), not by writing
     * the element as JSON and reading it back: what the mapper leaves out or writes differently (an empty text, the
     * {@code replaces} as the author wrote them) must not change in an element that is only being filtered.
     */
    private static Element onlyWhatIsRemoved(Element element, String reference, Set<String> kept) {
        if (!(element instanceof Parent<?> parent) || !holdsOthers(element, reference, kept)) {
            return element;
        }
        return (Element) withOnly(parent, reference, kept);
    }

    @SuppressWarnings("unchecked")
    private static <C extends Element> Parent<C> withOnly(Parent<C> parent, String reference, Set<String> kept) {
        val children = new LinkedHashSet<C>();
        for (val child : parent.getElements()) {
            val childReference = reference + "." + child.getId();
            if (kept.contains(childReference)) {
                children.add(
                    child instanceof Parent<?> grandParent && holdsOthers(child, childReference, kept)
                        ? (C) withOnly(grandParent, childReference, kept)
                        : child
                );
            }
        }
        return parent.withElements(children);
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

    /**
     * What a plateau (or the manifests) is made of, before it is indexed.
     *
     * @param resources the workspace
     * @param elements  the elements the manifests declare, still to be added to {@code resources} (none for a layered
     *                  plateau, whose chain was built into {@code resources})
     * @param selection the plateau that was read, or null for a workspace without plateaus
     * @param tree      the tree of the plateaus of a layered workspace, else null
     * @param removals  the {@code REMOVE} patches applied to build a layered plateau
     */
    private record Loaded(
        Workspace resources,
        Map<Class<?>, Set<ManifestParser.Candidate>> elements,
        Plateaus.Selection selection,
        PlateauTree tree,
        List<Removal> removals
    ) {}

    /** What the workspace file says, before any manifest is read. */
    private record Source(Workspace rawWorkspace, boolean manifestsPathsWritten, Path wksDir) {}

    @SneakyThrows
    private Source read(Path path) {
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
            throw ManifestParser.missingKey(e, "")
                .map(reason -> new ArchiCodeException("`%s` is not valid: %s", path.getFileName().toString(), reason))
                .orElseGet(() -> ArchiCodeException.unreadable(path.getFileName().toString(), e, true));
        }
        return new Source(
            rawWorkspace,
            tree.path("settings").path("manifests").has("paths"),
            path.toFile().getParentFile().toPath()
        );
    }

    @SneakyThrows
    private Loaded load(Path path, Path viewsDirPath, String plateauId) {
        val source = read(path);
        val rawWorkspace = source.rawWorkspace();
        val wksDir = source.wksDir();

        // the plateau to read; none for a workspace that has one set of manifests (manifests.paths), or layered plateaus
        val selection = Plateaus.select(rawWorkspace.getSettings(), source.manifestsPathsWritten(), plateauId);

        // The folder of the views. With plateaus, each plateau has its own, named after it (`views-to-be`, or `out-to-be`
        // for `--output out`), so that drawing two plateaus does not overwrite one with the other; without plateaus it is
        // the folder it has always been (the layered plateaus add their own name once the plateau is known).
        val viewsPath = Optional.ofNullable(viewsDirPath)
            .map(Path::toString)
            .orElseGet(() -> rawWorkspace.getSettings().getViews().getPath());
        val plateauViewsPath = selection == null ? viewsPath : viewsPath + "-" + selection.plateau().getId();
        val fixedRawWorkspace =
            viewsDirPath == null && selection == null ? rawWorkspace : withViewsPath(rawWorkspace, plateauViewsPath);

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
        // and the same reference in two plateaus is the very point of having two. Layered plateaus (a `plateau` in a header, a
        // manifest of kind plateau) and `settings.plateaus` are two ways to say the same thing: a workspace uses one
        val parsed = parse(path, source, manifestsDirs, selection == null);
        if (selection == null && parsed.plateaus().isLayered()) {
            return loadLayered(fixedRawWorkspace, parsed, plateauId);
        }
        if (selection == null) {
            // not layered either: there are no plateaus, and `--plateau` and `settings.current` have nothing to name
            Plateaus.requireNoPlateaus(rawWorkspace.getSettings(), plateauId);
        }

        return new Loaded(
            fixedRawWorkspace.toBuilder().views(parsed.views()).stories(parsed.stories()).build(),
            parsed.elements(),
            selection,
            null,
            List.of()
        );
    }

    /**
     * A layered plateau: the plateau asked for, else {@code settings.current}, else the last one of a tree that is one line;
     * built layer by layer from the root (see {@link LayerLoader}). Its views go to the folder named after it.
     */
    private Loaded loadLayered(Workspace workspace, ManifestParser.Parsed parsed, String requested) {
        val tree = parsed.plateaus();
        val id = chosen(workspace.getSettings().getCurrent(), tree, requested);
        val node = tree.node(id);
        val plateau = io.morin.archicode.resource.workspace.Settings.Plateau.builder()
            .id(id)
            .name(node.name())
            .horizon(node.horizon())
            .baseline(node.parent())
            .build();
        val loaded = layerLoader.load(
            withViewsPath(workspace, workspace.getSettings().getViews().getPath() + "-" + id),
            parsed,
            id
        );
        return new Loaded(loaded.resources(), Map.of(), new Plateaus.Selection(plateau, ""), tree, loaded.removals());
    }

    /** The plateau to read: the one asked for, else {@code settings.current}, else the end of a tree that is one line. */
    private static String chosen(String current, PlateauTree tree, String requested) {
        if (current != null && !tree.contains(current)) {
            throw new ArchiCodeException(
                "`settings.current` names the plateau `%s`, which is not a plateau of this workspace (the plateaus are %s)",
                current,
                tree
                    .ids()
                    .stream()
                    .map(i -> "`" + i + "`")
                    .collect(Collectors.joining(", "))
            );
        }
        if (requested != null) {
            return tree.node(requested).id();
        }
        if (current != null) {
            return current;
        }
        for (val node : tree.nodes()) {
            val children = tree.children(node.id());
            if (children.size() > 1) {
                throw new ArchiCodeException(
                    "the plateaus of this workspace are not one line (`%s` is overridden by %s): name the plateau to read with `--plateau`, or with `settings.current`",
                    node.id(),
                    children
                        .stream()
                        .map(c -> "`" + c.id() + "`")
                        .collect(Collectors.joining(", "))
                );
            }
        }
        return tree.ids().get(tree.ids().size() - 1);
    }

    private static Workspace withViewsPath(Workspace workspace, String viewsPath) {
        return workspace
            .toBuilder()
            .settings(
                workspace
                    .getSettings()
                    .toBuilder()
                    .views(workspace.getSettings().getViews().toBuilder().path(viewsPath).build())
                    .build()
            )
            .build();
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

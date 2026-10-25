package io.morin.archicode.workspace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.util.RawValue;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.manifest.ManifestDiscovery;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Settings.Facets.Facet;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.Change;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
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
        log.debug("index the elements of the application layer and of the technology layer");
        val indexes = ElementIndexFactory.indexLayers(resources, manifests, false);
        val appIndex = indexes.application();
        val depIndex = indexes.technology();

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
     *                     one of the plateaus when they form one line; it must be null for a workspace that has no plateaus
     */
    @SneakyThrows
    public io.morin.archicode.workspace.Workspace create(Path path, Path viewsDirPath, String plateauId) {
        val loaded = load(path, viewsDirPath, plateauId);
        return create(loaded.resources(), loaded.elements())
            .toBuilder()
            .plateau(loaded.plateau())
            .plateauTree(loaded.tree())
            .removals(loaded.removals())
            .steps(loaded.steps())
            .build();
    }

    /**
     * The plateaus of a workspace, and how they stack. A workspace without plateaus has {@code baseline} alone.
     *
     * @param path the workspace file
     * @return the tree of the plateaus
     * @throws ArchiCodeException when the workspace file has the key that no longer exists, or when a manifest or the tree of
     *                            the plateaus is wrong
     */
    @SneakyThrows
    public PlateauTree plateauTree(Path path) {
        val source = read(path);
        val settings = source.rawWorkspace().getSettings();
        requireReadablePaths(settings, null);
        val tree = parse(path, source, settings.getManifests().getPaths(), null).plateaus();
        if (!tree.isLayered()) {
            requireNoPlateaus(settings, null);
        }
        return tree;
    }

    /** Read the manifests of the folders, and tell the warnings of the tree of the plateaus they write. */
    private ManifestParser.Parsed parse(Path path, Source source, Set<String> manifestsDirs, Path viewsDirPath) {
        // the folders of the views are not manifests: the ones of the settings, and the ones `--output` names, which an earlier
        // run of the command wrote beside the workspace file
        val viewsPaths = new ArrayList<String>();
        viewsPaths.add(source.rawWorkspace().getSettings().getViews().getPath());
        if (viewsDirPath != null) {
            val wksDir = source.wksDir().toAbsolutePath().normalize();
            val output = viewsDirPath.isAbsolute() ? viewsDirPath.normalize() : viewsDirPath;
            // an absolute folder is left out only when it is below the folder of the workspace file, where it is read from
            if (!output.isAbsolute()) {
                viewsPaths.add(output.toString().replace('\\', '/'));
            } else if (output.startsWith(wksDir)) {
                viewsPaths.add(wksDir.relativize(output).toString().replace('\\', '/'));
            }
        }
        val parsed = manifestParser.parse(source.wksDir(), manifestsDirs, path, viewsPaths);
        warnings.warnAll(parsed.plateaus().warnings());
        return parsed;
    }

    /**
     * The workspace of a comparison: the plateau that is compared, holding in addition what only the baseline had, so that the
     * views of the comparison can draw it: the elements the comparison calls removed, each with what it holds, under its parent.
     * The plateau is not read again: the union is made from a copy of the tree of its elements, so that nothing merged here
     * shows in the workspace the plain views are drawn from, and the manifests are parsed once for each plateau a comparison
     * loads.
     *
     * @param target     the plateau that is compared, as {@link #create(Path, Path, String)} read it
     * @param base       the baseline, loaded on its own: where the removed elements are taken from
     * @param comparison what {@code base} and {@code target} do not share
     * @return the workspace of the plateau and the removed elements of the baseline
     */
    public io.morin.archicode.workspace.Workspace createUnion(
        io.morin.archicode.workspace.Workspace target,
        io.morin.archicode.workspace.Workspace base,
        Comparison comparison
    ) {
        // the index puts the removed elements under their parents: it must not be the tree of the target
        val resources = target
            .getResources()
            .toBuilder()
            .application((Application) copyOf(target.getApplication()))
            .technology((Technology) copyOf(target.getTechnology()))
            .build();
        val manifests = new HashMap<Class<?>, Set<ManifestParser.Candidate>>();
        addRemoved(manifests, Application.class, "application", base.appIndex, comparison);
        addRemoved(manifests, Technology.class, "technology", base.techIndex, comparison);
        return create(resources, manifests)
            .toBuilder()
            .plateau(target.getPlateau())
            .plateauTree(target.getPlateauTree())
            .removals(target.getRemovals())
            .steps(target.getSteps())
            .baseline(base.getPlateau())
            .build();
    }

    /**
     * The tree of a layer as new objects (the leaves are shared: indexing adds elements to the sets of the parents and
     * changes nothing else). The copy is made by the classes themselves, as in {@link #onlyWhatIsRemoved}.
     */
    private static <C extends Element> Parent<C> copyOf(Parent<C> parent) {
        val children = new LinkedHashSet<C>();
        for (val child : parent.getElements()) {
            children.add(copyOfChild(child));
        }
        return parent.withElements(children);
    }

    @SuppressWarnings("unchecked")
    private static <C extends Element> C copyOfChild(C child) {
        return child instanceof Parent<?> grandParent ? (C) copyOf(grandParent) : child;
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
            val parent = Workspace.Utilities.findParentReference(reference);
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
        return (
            element instanceof Parent<?> parent &&
            parent
                .getElements()
                .stream()
                .anyMatch(child -> {
                    val childReference = reference + "." + child.getId();
                    return !kept.contains(childReference) || holdsOthers(child, childReference, kept);
                })
        );
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
     * @param plateau   the plateau that was read, or null for a workspace without plateaus
     * @param tree      the tree of the plateaus of a workspace that has some, else null
     * @param removals  the {@code REMOVE} patches applied to build a plateau
     * @param steps     the plateaus of the chain a layered plateau is built from, the root first
     */
    private record Loaded(
        Workspace resources,
        Map<Class<?>, Set<ManifestParser.Candidate>> elements,
        Settings.Plateau plateau,
        PlateauTree tree,
        List<Removal> removals,
        List<PlateauStep> steps
    ) {}

    /** What the workspace file says, before any manifest is read. */
    private record Source(Workspace rawWorkspace, Path wksDir) {}

    /**
     * The sentence for a workspace file that still has the key of the plateaus of waves 008 to 013. The editor says the same
     * sentence, word for word ({@code REMOVED_PLATEAUS_KEY} in {@code standalone.html}); {@code plateau-model-cases.json}
     * and {@code negative-cases.json} pin it in both tools.
     */
    public static final String REMOVED_KEY =
        "`settings.plateaus` no longer exists: a plateau is a layer now. Remove the key, write `plateau: <id>` in the header of" +
        " the manifests of each plateau, and declare each plateau in a manifest of kind `archicode.morin.io/plateau`" +
        " (`id`, `name`, `override`: the plateau it builds on, `baseline` when absent, and `patches` for what it changes)";

    /** The name of the workspace file, the one {@code -w} defaults to. */
    public static final String WORKSPACE_FILE_NAME = ".archicode.yaml";

    /** The name it had before 0.18: no alias, a folder that still has it is told to rename it. */
    public static final String FORMER_WORKSPACE_FILE_NAME = "workspace.yaml";

    /**
     * The sentence for a folder that holds the former workspace file and not the new one. The editor says the same sentence,
     * word for word ({@code FORMER_WORKSPACE_FILE_SENTENCE} in {@code standalone.html}); {@code workspace-file-name-cases.json}
     * pins it in both tools.
     */
    public static final String FORMER_NAME_SENTENCE =
        "`workspace.yaml` is no longer the name of the workspace file: rename it to `.archicode.yaml`" +
        " (`git mv workspace.yaml .archicode.yaml`), or tell the command line where it is with `-w workspace.yaml`";

    /**
     * Whether the workspace file is missing under its name while the folder holds the file under the former name.
     *
     * @param path the workspace file asked for
     * @return whether the folder is one that was not renamed
     */
    public static boolean holdsFormerNameOnly(Path path) {
        val parent = path.toAbsolutePath().getParent();
        return (
            parent != null &&
            WORKSPACE_FILE_NAME.equals(String.valueOf(path.getFileName())) &&
            !Files.isRegularFile(path) &&
            Files.isRegularFile(parent.resolve(FORMER_WORKSPACE_FILE_NAME))
        );
    }

    @SneakyThrows
    private Source read(Path path) {
        log.info("parse the resources {}", path);

        if (holdsFormerNameOnly(path)) {
            throw WorkspaceFileException.formerName();
        }
        if (!Files.isRegularFile(path)) {
            throw WorkspaceFileException.missing(path);
        }

        // create the RawWorkspace
        val workspaceMapper = mapperFactory.create(path);
        // what the author wrote: the key that no longer exists is told before anything else is read
        final Workspace rawWorkspace;
        try {
            if (workspaceMapper.readTree(path.toFile()).path("settings").has("plateaus")) {
                throw new ArchiCodeException("%s", REMOVED_KEY);
            }
            // a file with nothing in it (or only comments, or only `null`) is a workspace with nothing in it: every default
            rawWorkspace = Optional.ofNullable(workspaceMapper.readValue(path.toFile(), Workspace.class)).orElseGet(
                () -> Workspace.builder().build()
            );
        } catch (JsonProcessingException e) {
            if (ManifestParser.isEmptyDocument(e)) {
                return new Source(Workspace.builder().build(), path.toFile().getParentFile().toPath());
            }
            throw ManifestParser.missingKey(e, "")
                .map(reason -> new ArchiCodeException("`%s` is not valid: %s", path.getFileName().toString(), reason))
                .orElseGet(() -> ArchiCodeException.unreadable(path.getFileName().toString(), e, true));
        } catch (IOException e) {
            // not a text that is wrong, the file itself: it was a stack trace (an unexpected FileNotFoundException) before
            throw WorkspaceFileException.unreadable(path, e);
        }
        return new Source(rawWorkspace, path.toFile().getParentFile().toPath());
    }

    @SneakyThrows
    private Loaded load(Path path, Path viewsDirPath, String plateauId) {
        val source = read(path);
        val rawWorkspace = source.rawWorkspace();
        requireReadablePaths(rawWorkspace.getSettings(), plateauId);
        requireFacetsThatAreFolders(rawWorkspace.getSettings());

        // The folder of the views: the one of the settings, or the one asked for. The plateaus add their own name once the
        // plateau is known (`views-saas`, or `out-saas` for `--output out`), so that drawing two plateaus does not overwrite
        // one with the other; without plateaus it is the folder it has always been.
        val fixedRawWorkspace =
            viewsDirPath == null ? rawWorkspace : withViewsPath(rawWorkspace, viewsDirPath.toString());

        // parse the manifests: the elements, and the views and the stories that are manifests of their own, which join
        // the ones of .archicode.yaml. A reference declared twice is an error inside a plateau and in a plateau and its
        // ancestors, and the same reference in two plateaus that do not stack is the very point of having two
        val parsed = parse(path, source, fixedRawWorkspace.getSettings().getManifests().getPaths(), viewsDirPath);
        if (parsed.plateaus().isLayered()) {
            return loadLayered(fixedRawWorkspace, parsed, plateauId);
        }
        // there are no plateaus, and `--plateau` and `settings.current` have nothing to name
        requireNoPlateaus(rawWorkspace.getSettings(), plateauId);
        requireNoPlateauInSteps(parsed, fixedRawWorkspace);

        return new Loaded(
            fixedRawWorkspace.toBuilder().views(parsed.views()).stories(parsed.stories()).build(),
            parsed.elements(),
            null,
            null,
            List.of(),
            List.of()
        );
    }

    /**
     * Refuse the entries of {@code settings.manifests.paths} that leave the folder of the workspace or use {@code **} where
     * it is not read, before any manifest is read. The sentences of {@code settings.current} and {@code --plateau} that name
     * nothing come with them, as they always did.
     */
    private void requireReadablePaths(Settings settings, String requested) {
        val problems = new ArrayList<String>(ManifestDiscovery.pathProblems(settings.getManifests().getPaths()));
        if (!problems.isEmpty()) {
            problems.addAll(noPlateausProblems(settings, requested));
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
    }

    /**
     * Refuse the facet whose name cannot be the name of a folder, before any manifest is read ({@link FacetNames}, issue #147).
     */
    private void requireFacetsThatAreFolders(Settings settings) {
        val problems = FacetNames.problems(settings);
        if (!problems.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
    }

    /**
     * Refuse {@code settings.current} and {@code --plateau} for a workspace that has no plateau at all: there is nothing for
     * them to name.
     */
    private void requireNoPlateaus(Settings settings, String requested) {
        val problems = noPlateausProblems(settings, requested);
        if (!problems.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
    }

    /**
     * Refuse a step of a story that is told at a plateau, or compared with one ({@code at}, {@code against}, wave 015 run 0101),
     * in a workspace that has no plateau at all: there is nothing for it to name. A layered workspace checks them with the
     * other names of the stories, once its layers are built ({@link LayerLoader}).
     */
    private void requireNoPlateauInSteps(ManifestParser.Parsed parsed, Workspace workspace) {
        val problems = new ArrayList<String>();
        for (val entry : LayerLoader.storiesOf(parsed, workspace)) {
            val steps = entry.item().getSteps();
            for (int i = 0; i < steps.size(); i++) {
                problems.addAll(
                    LayerLoader.stepPlateauProblems(
                        entry.source(),
                        entry.item().getId(),
                        i + 1,
                        steps.get(i),
                        List.of()
                    )
                );
            }
        }
        if (!problems.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
    }

    /** Whether {@code settings.current} names a plateau: an empty text, like a key with no value, names none (the editor reads it so). */
    private static boolean isWritten(String current) {
        return current != null && !current.isEmpty();
    }

    private static List<String> noPlateausProblems(Settings settings, String requested) {
        val problems = new ArrayList<String>();
        if (isWritten(settings.getCurrent())) {
            problems.add(
                "`settings.current` is `" +
                    settings.getCurrent() +
                    "` but the workspace declares no plateau" +
                    NO_PLATEAU
            );
        }
        if (requested != null) {
            problems.add(
                "`--plateau " + requested + "` cannot be used: the workspace declares no plateau" + NO_PLATEAU
            );
        }
        return problems;
    }

    /** What makes a plateau: said wherever a workspace has none and is asked for one. */
    public static final String NO_PLATEAU =
        " (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)";

    /**
     * A layered plateau: the plateau asked for, else {@code settings.current}, else the last one of a tree that is one line;
     * built layer by layer from the root (see {@link LayerLoader}). Its views go to the folder named after it.
     */
    private Loaded loadLayered(Workspace workspace, ManifestParser.Parsed parsed, String requested) {
        val tree = parsed.plateaus();
        val id = chosen(workspace.getSettings().getCurrent(), tree, requested);
        val node = tree.node(id);
        val plateau = Settings.Plateau.builder()
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
        return new Loaded(loaded.resources(), Map.of(), plateau, tree, loaded.removals(), loaded.steps());
    }

    /**
     * The plateau to read: the one asked for, else {@code settings.current}, else the end of a tree that is one line. The plateau
     * asked for comes first: {@code settings.current} is looked at only when nothing was asked, so that {@code --plateau} can
     * get past a {@code current} that names a plateau that is gone (after a rename).
     */
    private static String chosen(String current, PlateauTree tree, String requested) {
        if (requested != null) {
            return tree.node(requested).id();
        }
        if (isWritten(current)) {
            if (!tree.contains(current)) {
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

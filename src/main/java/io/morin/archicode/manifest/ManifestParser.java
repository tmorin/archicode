package io.morin.archicode.manifest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.plateau.Plateau;
import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.view.View;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class ManifestParser {

    MapperFactory mapperFactory;

    /**
     * Read the manifests: the elements, by category, and the views and the stories that are manifests of their own.
     */
    public Parsed parse(Path wksDir, Set<String> manifestsDirs) {
        return parse(wksDir, manifestsDirs, null);
    }

    /** The folder of the generated views when the workspace does not say ({@code settings.views.path}). */
    private static final String DEFAULT_VIEWS_PATH = "views";

    /**
     * Read the manifests, leaving the workspace file out when a folder is the one it is in (a plateau, or a manifests
     * folder, written as {@code .}).
     *
     * @param workspaceFile the workspace file, or null
     */
    public Parsed parse(Path wksDir, Set<String> manifestsDirs, Path workspaceFile) {
        return parse(wksDir, manifestsDirs, workspaceFile, DEFAULT_VIEWS_PATH);
    }

    /**
     * Read the manifests, and say what is wrong with the plateaus they write (see {@link PlateauTree}): every mistake of the
     * tree, then the references declared twice in a plateau, then those declared again in an ancestor, one sentence each.
     *
     * @param workspaceFile the workspace file, or null
     * @param viewsPath     {@code settings.views.path} as written in the workspace file: the folders of the generated views
     *                      are not read below a path that ends in {@code /**}
     */
    public Parsed parse(Path wksDir, Set<String> manifestsDirs, Path workspaceFile, String viewsPath) {
        return parse(wksDir, manifestsDirs, workspaceFile, Collections.singletonList(viewsPath));
    }

    /**
     * Read the manifests, as {@link #parse(Path, Set, Path, String)}, when more than one folder of generated views is to be
     * left out: the one of {@code settings.views.path} and the one a command was given with {@code --output}.
     *
     * @param workspaceFile the workspace file, or null
     * @param viewsPaths    the beginnings of the names of the folders of the generated views
     */
    @SneakyThrows
    public Parsed parse(Path wksDir, Set<String> manifestsDirs, Path workspaceFile, Collection<String> viewsPaths) {
        val map = new HashMap<Class<?>, Set<Candidate>>();
        val views = new ArrayList<Placed<View>>();
        val stories = new ArrayList<Placed<Story>>();
        // where each reference is declared, by plateau and by layer ("application", "technology"), and each view and story
        // ("view", "story"): one declared twice in a plateau is an error, whichever way it is declared (a manifest of its
        // own, an element nested in another, a manifest placed under a parent); one declared again in an ancestor of its
        // plateau is an error too (see PlateauTree.redeclared)
        val declarations = new HashMap<String, Map<String, Map<String, List<String>>>>();
        // the plateaus: the manifests of kind plateau, the ids that headers name, and the first manifest that uses layers
        val plateauManifests = new ArrayList<PlateauTree.Declared>();
        val plateauHeaders = new TreeMap<String, List<String>>();
        String layeredBy = null;

        for (Path manifestFile : ManifestDiscovery.discover(wksDir, manifestsDirs, viewsPaths, workspaceFile)) {
            log.info("parse the manifest {}", manifestFile);

            val mapper = mapperFactory.create(manifestFile);
            val source = sourceOf(wksDir, manifestFile);
            final Manifest resource;
            try {
                resource = mapper.readValue(manifestFile.toFile(), Manifest.class);
            } catch (JsonProcessingException e) {
                throw emptyManifest(e)
                    .or(() -> missingKey(e, ""))
                    .map(reason -> new ArchiCodeException("`%s` is not valid: %s", source, reason))
                    .orElseGet(() -> ArchiCodeException.unreadable(source, e, true));
            }
            final Object item;
            try {
                item = ManifestConverter.builder().manifest(resource).mapper(mapper).build().convert();
            } catch (JsonProcessingException e) {
                // the content is read again from a string: the line and the column are not those of the file
                throw missingKey(e, "content")
                    .map(reason -> new ArchiCodeException("`%s` is not valid: %s", source, reason))
                    .orElseGet(() -> ArchiCodeException.unreadable(source, e, false));
            }

            // the plateau of the manifest: the one its header names, else baseline (a manifest of kind plateau names its own)
            val written = resource.getHeader().getPlateau();
            val plateau = written == null ? Plateau.BASELINE : written;
            if (written != null && !(item instanceof Plateau)) {
                plateauHeaders.computeIfAbsent(written, id -> new ArrayList<>()).add(source);
                if (layeredBy == null) {
                    layeredBy = "`" + source + "` says `plateau: " + written + "` in its header";
                }
            }

            if (item instanceof Element element) {
                declare(
                    declarations
                        .computeIfAbsent(plateau, p -> new HashMap<>())
                        .computeIfAbsent(
                            resource.getKind().getCategory() == Application.class ? "application" : "technology",
                            c -> new HashMap<>()
                        ),
                    resource.getHeader().getParent(),
                    resource.getContent(),
                    source
                );
                val reference = Optional.ofNullable(resource.getHeader().getParent())
                    .map(parentReference -> String.format("%s.%s", parentReference, element.getId()))
                    .orElse(element.getId());
                val candidate = Candidate.builder()
                    .parent(resource.getHeader().getParent())
                    .reference(reference)
                    .element(element)
                    .plateau(plateau)
                    .build();
                map.putIfAbsent(resource.getKind().getCategory(), new HashSet<>());
                map.get(resource.getKind().getCategory()).add(candidate);
            } else if (item instanceof View view) {
                views.add(new Placed<>(plateau, source, view));
                declarations
                    .computeIfAbsent(plateau, p -> new HashMap<>())
                    .computeIfAbsent("view", c -> new HashMap<>())
                    .computeIfAbsent(view.getId(), r -> new ArrayList<>())
                    .add(source);
            } else if (item instanceof Story story) {
                stories.add(new Placed<>(plateau, source, story));
                declarations
                    .computeIfAbsent(plateau, p -> new HashMap<>())
                    .computeIfAbsent("story", c -> new HashMap<>())
                    .computeIfAbsent(story.getId(), r -> new ArrayList<>())
                    .add(source);
            } else if (item instanceof Plateau declared) {
                if (!declared.shapeProblems().isEmpty()) {
                    throw new ArchiCodeException("`%s` is not valid: %s", source, declared.shapeProblems().get(0));
                }
                plateauManifests.add(new PlateauTree.Declared(declared, source));
                if (layeredBy == null) {
                    layeredBy = "`" + source + "` is a manifest of kind `archicode.morin.io/plateau`";
                }
            }
        }
        // the mistakes of the tree of the plateaus (an id, a parent, a cycle), then what each plateau declares: a reference
        // declared twice in a plateau, or again in one of its ancestors (which needs a tree that is right)
        val problems = new ArrayList<String>(PlateauTree.problems(plateauManifests, plateauHeaders));
        val treeIsRight = problems.isEmpty();
        problems.addAll(duplicates(declarations));
        val tree = treeIsRight ? PlateauTree.of(plateauManifests, plateauHeaders, layeredBy) : null;
        if (tree != null) {
            problems.addAll(tree.redeclared(declarations));
        }
        if (!problems.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
        return new Parsed(map, views, stories, tree);
    }

    /** What is said of a manifest that is empty: it lacks its header, which is told by the first key it needs. */
    static Optional<String> emptyManifest(JsonProcessingException e) {
        return e instanceof JsonMappingException mapping &&
            mapping.getOriginalMessage() != null &&
            mapping.getOriginalMessage().startsWith("No content to map due to end-of-input")
            ? Optional.of("Missing header.kind")
            : Optional.empty();
    }

    private static final Pattern NON_NULL = Pattern.compile("(\\w+) is marked non-null but is null");

    /**
     * What is said of a manifest that lacks a required key, or is empty: the words of the editor ({@code Missing
     * header.kind}, {@code Missing header.version}, {@code Missing content.id}, in {@code parseManifestText} of
     * {@code standalone.html}: keep them alike), and not the class the reader failed to build. A manifest without a
     * {@code header} or without a {@code content} is told by the first key it needs.
     *
     * @param e     what the reader said
     * @param under the path of the part of the file that was read again on its own ({@code content}), or empty
     * @return the reason, or empty when the reader did not fail for a missing key
     */
    public static Optional<String> missingKey(JsonProcessingException e, String under) {
        if (!(e instanceof JsonMappingException mapping) || mapping.getOriginalMessage() == null) {
            return Optional.empty();
        }
        val message = mapping.getOriginalMessage().lines().findFirst().orElse("");
        val found = NON_NULL.matcher(message);
        if (!found.find()) {
            return Optional.empty();
        }
        val key = found.group(1);
        val where = new StringBuilder(under);
        val path = mapping.getPath();
        for (int i = 0; i < path.size(); i++) {
            val reference = path.get(i);
            if (reference.getFieldName() != null) {
                // a key that is there and null is reported at the key itself: it is not the path to the key, once more
                if (i == path.size() - 1 && reference.getFieldName().equals(key)) {
                    break;
                }
                where.append(where.isEmpty() ? "" : ".").append(reference.getFieldName());
            } else {
                where.append('[').append(reference.getIndex()).append(']');
            }
        }
        if (where.isEmpty()) {
            return Optional.of(
                key.equals("content")
                    ? "Missing content.id"
                    : key.equals("header")
                      ? "Missing header.kind"
                      : "Missing " + key
            );
        }
        return Optional.of("Missing " + where + "." + key);
    }

    /**
     * The name of a manifest file in a message: its path from the folder of the workspace, with `/` on every system.
     */
    static String sourceOf(Path wksDir, Path manifestFile) {
        return wksDir.relativize(manifestFile).normalize().toString().replace('\\', '/');
    }

    /**
     * Record the references an element manifest declares: its own (placed under the parent of its header, if any) and
     * those of the elements nested in it, at any depth. Read from the content as written, like the editor does, so that
     * the two agree on what is declared.
     */
    private static void declare(Map<String, List<String>> sources, String parent, JsonNode content, String source) {
        val id = content.path("id").asText();
        declareTree(sources, parent == null ? id : parent + "." + id, content, source);
    }

    private static void declareTree(Map<String, List<String>> sources, String reference, JsonNode node, String source) {
        sources.computeIfAbsent(reference, r -> new ArrayList<>()).add(source);
        for (JsonNode child : node.path("elements")) {
            if (child.isObject() && child.hasNonNull("id") && !child.get("id").asText().isEmpty()) {
                declareTree(sources, reference + "." + child.get("id").asText(), child, source);
            }
        }
    }

    /**
     * The sentences for the references declared more than once in a plateau: there is no way to tell which declaration is
     * meant, and keeping one of them silently would draw a model nobody wrote. The message names the reference and the
     * files, in an order that does not depend on the order the file system lists them in.
     */
    private static List<String> duplicates(Map<String, Map<String, Map<String, List<String>>>> declarations) {
        val messages = new TreeMap<String, TreeSet<String>>(); // by reference, then by message
        declarations.values().forEach(plateau ->
            plateau.forEach((namespace, ids) ->
                ids.forEach((id, sources) -> {
                    if (sources.size() > 1) {
                        // an element has a reference, in a layer; a view and a story have an id of their own
                        val noun = namespace.equals("view") || namespace.equals("story") ? namespace : "reference";
                        messages.computeIfAbsent(id, r -> new TreeSet<>()).add(duplicateMessage(noun, id, sources));
                    }
                })
            )
        );
        return messages.values().stream().flatMap(Set::stream).toList();
    }

    /**
     * The message for a reference declared more than once. Its wording is the one of the editor
     * (`duplicateReferenceMessage`): keep them alike. The noun is `reference` for an element, `view` or `story`.
     */
    static String duplicateMessage(String noun, String reference, List<String> sources) {
        val counts = new TreeMap<String, Integer>();
        sources.forEach(source -> counts.merge(source, 1, Integer::sum));
        val times = sources.size() == 2 ? "twice" : sources.size() + " times";
        if (counts.size() == 1) {
            return String.format("the %s `%s` is declared %s in `%s`", noun, reference, times, sources.get(0));
        }
        val files = counts
            .entrySet()
            .stream()
            .map(
                e ->
                    "`" +
                    e.getKey() +
                    "`" +
                    (e.getValue() == 1 ? "" : e.getValue() == 2 ? " (twice)" : " (" + e.getValue() + " times)")
            )
            .toList();
        val where = String.join(", ", files.subList(0, files.size() - 1)) + " and " + files.get(files.size() - 1);
        return String.format("the %s `%s` is declared %s: in %s", noun, reference, times, where);
    }

    /**
     * What the manifests hold.
     *
     * @param elements the elements, by category (application, technology), each with the plateau it belongs to
     * @param placedViews   the views that are manifests of their own, each with its plateau
     * @param placedStories the stories, each with its plateau
     * @param plateaus the plateaus of the workspace and how they stack (see {@link PlateauTree}); {@code baseline} alone for a
     *                 workspace that uses none
     */
    public record Parsed(
        Map<Class<?>, Set<Candidate>> elements,
        List<Placed<View>> placedViews,
        List<Placed<Story>> placedStories,
        PlateauTree plateaus
    ) {
        /** The views of every plateau. */
        public Set<View> views() {
            return placedViews
                .stream()
                .map(Placed::item)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        }

        /** The stories of every plateau. */
        public Set<Story> stories() {
            return placedStories
                .stream()
                .map(Placed::item)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        }

        /**
         * What one plateau declares on its own: not what it inherits from its ancestors, not what overrides it. The loader
         * adds it to the graph of the parent, then applies the patches of the plateau ({@link PlateauTree#chain}).
         *
         * @param id the id of the plateau
         * @return the elements, views and stories whose manifests say {@code plateau: <id>} (the same tree of plateaus)
         */
        public Parsed ofPlateau(String id) {
            val own = new HashMap<Class<?>, Set<Candidate>>();
            elements.forEach((category, candidates) -> {
                val some = new HashSet<Candidate>();
                candidates
                    .stream()
                    .filter(c -> c.getPlateau().equals(id))
                    .forEach(some::add);
                if (!some.isEmpty()) {
                    own.put(category, some);
                }
            });
            return new Parsed(
                own,
                placedViews
                    .stream()
                    .filter(v -> v.plateau().equals(id))
                    .toList(),
                placedStories
                    .stream()
                    .filter(v -> v.plateau().equals(id))
                    .toList(),
                plateaus
            );
        }
    }

    /**
     * A view or a story, with the plateau it belongs to and the file it is in.
     *
     * @param plateau the plateau its header names, else {@code baseline}
     * @param source  the file, from the folder of the workspace
     * @param item    the view or the story
     * @param <T>     the type of {@code item}
     */
    public record Placed<T>(String plateau, String source, T item) {}

    @Value
    @Builder
    @Jacksonized
    @ToString(onlyExplicitlyIncluded = true)
    public static class Candidate {

        String parent;

        @NonNull
        @ToString.Include
        String reference;

        @NonNull
        @ToString.Include
        Element element;

        /** The plateau the manifest belongs to: the one its header names, else {@code baseline}. */
        @NonNull
        @Builder.Default
        String plateau = Plateau.BASELINE;
    }
}

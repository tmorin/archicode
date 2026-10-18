package io.morin.archicode.manifest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.view.View;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.File;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
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

    /**
     * Read the manifests, leaving the workspace file out when a folder is the one it is in (a plateau, or a manifests
     * folder, written as {@code .}).
     *
     * @param workspaceFile the workspace file, or null
     */
    @SneakyThrows
    public Parsed parse(Path wksDir, Set<String> manifestsDirs, Path workspaceFile) {
        val map = new HashMap<Class<?>, Set<Candidate>>();
        val views = new LinkedHashSet<View>();
        val stories = new LinkedHashSet<Story>();
        // where each reference is declared, by layer ("application", "technology"), and each view and story ("view",
        // "story"): one declared twice is an error, whichever way it is declared (a manifest of its own, an element nested
        // in another, a manifest placed under a parent)
        val declarations = new HashMap<String, Map<String, List<String>>>();

        val paths = manifestsDirs
            .stream()
            .map(wksDir::resolve)
            .filter(path -> path.toFile().exists())
            .collect(Collectors.toSet());

        for (Path path : paths) {
            val directory = path.toFile();

            val manifestFilesAsArray = Optional.ofNullable(
                directory.listFiles((dir, name) -> MapperFormat.resolve(name).isPresent())
            ).orElseThrow(() -> new ArchiCodeException("unable to read the path %s", path));

            for (Path manifestFile : Arrays.stream(manifestFilesAsArray)
                .map(File::toPath)
                .collect(Collectors.toSet())) {
                if (
                    workspaceFile != null &&
                    manifestFile.toAbsolutePath().normalize().equals(workspaceFile.toAbsolutePath().normalize())
                ) {
                    continue; // the workspace is not a manifest of itself
                }
                log.info("parse the manifest {}", manifestFile);

                val mapper = mapperFactory.create(manifestFile);
                val source = sourceOf(wksDir, manifestFile);
                final Manifest resource;
                try {
                    resource = mapper.readValue(manifestFile.toFile(), Manifest.class);
                } catch (JsonProcessingException e) {
                    throw layeredPlateau(e)
                        .or(() -> emptyManifest(e))
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

                if (item instanceof Element element) {
                    declare(
                        declarations.computeIfAbsent(
                            resource.getKind().getCategory() == Application.class ? "application" : "technology",
                            c -> new HashMap<>()
                        ),
                        resource.getHeader().getParent(),
                        resource.getContent(),
                        sourceOf(wksDir, manifestFile)
                    );
                    val reference = Optional.ofNullable(resource.getHeader().getParent())
                        .map(parentReference -> String.format("%s.%s", parentReference, element.getId()))
                        .orElse(element.getId());
                    val candidate = Candidate.builder()
                        .parent(resource.getHeader().getParent())
                        .reference(reference)
                        .element(element)
                        .build();
                    map.putIfAbsent(resource.getKind().getCategory(), new HashSet<>());
                    map.get(resource.getKind().getCategory()).add(candidate);
                } else if (item instanceof View view) {
                    views.add(view);
                    declarations
                        .computeIfAbsent("view", c -> new HashMap<>())
                        .computeIfAbsent(view.getId(), r -> new ArrayList<>())
                        .add(sourceOf(wksDir, manifestFile));
                } else if (item instanceof Story story) {
                    stories.add(story);
                    declarations
                        .computeIfAbsent("story", c -> new HashMap<>())
                        .computeIfAbsent(story.getId(), r -> new ArrayList<>())
                        .add(sourceOf(wksDir, manifestFile));
                }
            }
        }
        failOnDuplicates(declarations);
        return new Parsed(map, views, stories);
    }

    /**
     * What is said of a manifest that is a layered plateau. The editor says the same words ({@code LAYERED_PLATEAU} in
     * {@code standalone.html}): keep them alike. It is the end of the sentence that begins with the key.
     */
    static final String LAYERED_PLATEAU =
        " is not supported yet: layered plateaus (a plateau written as an increment on top of another one) are reserved" +
        " for a later version of ArchiCode (see #30). Give each plateau its own folder of manifests in" +
        " `settings.plateaus` instead";

    /**
     * Whether the reader refused a manifest because it is a layered plateau, which ArchiCode does not know yet: its
     * {@code kind} is {@code plateau} or its header has a {@code plateau}. Neither is recognised or accepted; both are
     * told once, in one sentence, as the {@code from} of a plateau of the workspace is. Every other kind and every other
     * key keeps the message of the reader.
     *
     * @param e what the reader said
     * @return the reason, which names the key, or empty
     */
    static Optional<String> layeredPlateau(JsonProcessingException e) {
        if (!(e instanceof JsonMappingException mapping)) {
            return Optional.empty();
        }
        val path = mapping.getPath().stream().map(JsonMappingException.Reference::getFieldName).toList();
        if (e instanceof UnrecognizedPropertyException && path.equals(List.of("header", "plateau"))) {
            return Optional.of("`header.plateau`" + LAYERED_PLATEAU);
        }
        if (
            e instanceof InvalidFormatException invalid &&
            path.equals(List.of("header", "kind")) &&
            invalid.getValue() instanceof String kind &&
            kind.strip().toLowerCase(Locale.ROOT).replaceFirst("^archicode\\.morin\\.io/", "").equals("plateau")
        ) {
            return Optional.of("`kind: plateau`" + LAYERED_PLATEAU);
        }
        return Optional.empty();
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
     * Fail when a reference is declared more than once in the layer: there is no way to tell which declaration is
     * meant, and keeping one of them silently would draw a model nobody wrote. The message names the reference and the
     * files, in an order that does not depend on the order the file system lists them in.
     */
    private static void failOnDuplicates(Map<String, Map<String, List<String>>> declarations) {
        val messages = new TreeMap<String, TreeSet<String>>(); // by reference, then by message
        declarations.forEach((namespace, ids) ->
            ids.forEach((id, sources) -> {
                if (sources.size() > 1) {
                    // an element has a reference, in a layer; a view and a story have an id of their own
                    val noun = namespace.equals("view") || namespace.equals("story") ? namespace : "reference";
                    messages.computeIfAbsent(id, r -> new TreeSet<>()).add(duplicateMessage(noun, id, sources));
                }
            })
        );
        if (!messages.isEmpty()) {
            throw new ArchiCodeException(
                "%s",
                String.join("\n", messages.values().stream().flatMap(Set::stream).toList())
            );
        }
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
     * @param elements the elements, by category (application, technology)
     * @param views    the views that are manifests of their own
     * @param stories  the stories
     */
    public record Parsed(Map<Class<?>, Set<Candidate>> elements, Set<View> views, Set<Story> stories) {}

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
    }
}

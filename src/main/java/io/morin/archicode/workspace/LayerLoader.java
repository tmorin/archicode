package io.morin.archicode.workspace;

import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Replaces;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import io.morin.archicode.resource.plateau.Patch;
import io.morin.archicode.resource.plateau.PlateauTree;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Workspace;
import io.morin.archicode.viewpoint.kernel.ViewpointKernel;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * Loads a layered plateau as its chain: for each plateau from {@code baseline} down to the one that is drawn, the elements
 * whose manifests say {@code plateau: <layer>} are added to the graph of the plateau above, then the ordered patches of the
 * layer change that graph (the kernel's {@code apply_patches}), then the layer is checked: what the graph points at must be
 * there. A mistake names the layer. The views and the stories belong to no plateau (wave 015, run 0100, issue #100): they are
 * the workspace's whatever plateau is drawn, and are checked once, after the layers, by a rule that is not about a plateau
 * (every element they name exists in at least one plateau, see {@link #entryProblems}).
 *
 * <p>The patches of a layer see the elements the layer has just added, since they are in the graph before the patches run.
 * The first mistake ends the load: the layers below it are not looked at, so that nothing is told twice. A layer without
 * patches does not leave the objects of the model: nothing is written as JSON and read back for it.
 *
 * <p>The checks are the ones of the kernel for a plateau ({@code dangling reference}), in the author's words: a relationship,
 * an entry of {@code uses} and an application deployed on a node must name an element of the graph, and an element declared
 * under a parent must have that parent.
 */
@Slf4j
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class LayerLoader {

    MapperFactory mapperFactory;

    /**
     * What the chain gives.
     *
     * @param resources the workspace, with every element of the chain in its two layers, and the views and stories
     * @param removals  the {@code REMOVE} patches of the chain, in the order they were applied
     * @param steps     the plateaus of the chain, the root first, each as it was once its layer was applied
     */
    public record Loaded(Workspace resources, List<Removal> removals, List<PlateauStep> steps) {}

    /**
     * Load a plateau.
     *
     * @param start     the workspace of {@code workspace.yaml}: its settings, styles and formatters, and the elements it
     *                  declares itself, which belong to {@code baseline}
     * @param parsed    what the manifests declare, by plateau (see {@link ManifestParser.Parsed#ofPlateau})
     * @param plateauId the plateau to load, of the tree {@code parsed} holds
     * @return the plateau
     * @throws ArchiCodeException with the sentence of the layer that is wrong
     */
    public Loaded load(Workspace start, ManifestParser.Parsed parsed, String plateauId) {
        val chain = parsed.plateaus().chain(plateauId);
        var resources = start;
        val removals = new ArrayList<Removal>();
        val steps = new ArrayList<PlateauStep>();
        // one mapper for the load (built by the first layer that has patches), not one for each of them
        ObjectMapper json = null;
        Indexes drawn = null;
        for (val node : chain) {
            log.info("load the plateau {}", node.id());
            val own = parsed.ofPlateau(node.id());
            var indexes = index(resources, own.elements());
            // before the patches: a patch may remove a parent, and the elements declared under it go with it
            tell(parentProblems(node.id(), indexes, own.elements()));
            if (!node.patches().isEmpty()) {
                json = json == null ? patchMapper() : json;
                resources = applyPatches(json, node, resources, removals);
                indexes = index(resources, Map.of());
            }
            tell(problems(node.id(), indexes));
            drawn = indexes;
            steps.add(new PlateauStep(node.id(), indexes.application(), indexes.technology()));
        }
        // the views and the stories belong to no plateau: checked once, against the plateau that is drawn and then, for what it
        // lacks, against what any plateau declares
        tell(entryProblems(parsed, drawn, start));
        resources = resources.toBuilder().views(parsed.views()).stories(parsed.stories()).build();
        return new Loaded(resources, removals, steps);
    }

    /** The mistakes of a layer, one sentence per line; nothing when there is none. */
    private static void tell(Collection<String> problems) {
        if (!problems.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
    }

    /** The two indexes of a graph: the elements of the application layer and of the technology layer. */
    private record Indexes(ElementIndex application, ElementIndex technology) {
        ElementIndex of(View.Layer layer) {
            return layer == View.Layer.TECHNOLOGY ? technology : application;
        }
    }

    /** Index the graph, adding the elements the manifests of a layer declare to it (the model is changed by this). */
    private static Indexes index(Workspace resources, Map<Class<?>, Set<ManifestParser.Candidate>> candidates) {
        val layers = ElementIndexFactory.indexLayers(resources, candidates, true);
        return new Indexes(layers.application(), layers.technology());
    }

    // ---- the patches ----

    /**
     * Hand the graph and the patches of a layer to the kernel, and read the graph back. The kernel is given the elements
     * of the two layers as JSON, the document it takes for a facet, and nothing else of the workspace.
     *
     * @param json the mapper of the load (see {@link #patchMapper})
     */
    @SneakyThrows
    private Workspace applyPatches(
        ObjectMapper json,
        PlateauTree.Node node,
        Workspace resources,
        List<Removal> removals
    ) {
        val workspace = json.createObjectNode();
        workspace.set("application", layerOf(json, resources.getApplication()));
        workspace.set("technology", layerOf(json, resources.getTechnology()));
        val request = json.createObjectNode();
        request.set("workspace", workspace);
        request.put("plateau", node.id());
        val patches = request.putArray("patches");
        node.patches().forEach(patch -> patches.add(kernelPatch(json, patch)));

        val answer = json.readTree(ViewpointKernel.getInstance().applyPatches(json.writeValueAsString(request)));
        if (answer.has("error")) {
            throw new ArchiCodeException("%s", answer.get("error").asText());
        }
        if (answer.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, expected %s",
                answer.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }
        for (val report : answer.path("patches")) {
            if (report.path("operator").asText().equals("REMOVE")) {
                removals.add(removal(node.id(), report));
            }
        }
        val after = answer.path("workspace");
        try {
            return resources
                .toBuilder()
                .application(
                    after.has("application")
                        ? json.treeToValue(after.get("application"), Application.class)
                        : Application.builder().build()
                )
                .technology(
                    after.has("technology")
                        ? json.treeToValue(after.get("technology"), Technology.class)
                        : Technology.builder().build()
                )
                .build();
        } catch (JsonProcessingException e) {
            // the layer is a graph the model cannot hold once it is written as JSON (an element under a parent that cannot
            // hold its kind: without patches the graph is never written, and nobody notices)
            throw new ArchiCodeException(
                "in the plateau `%s`, the elements cannot be read once the patches are applied: %s",
                node.id(),
                ArchiCodeException.unreadable(null, e, false).getMessage().replaceFirst("^a file is not valid: ", "")
            );
        }
    }

    /**
     * The mapper that writes the graph for the kernel and reads it back. It is the mapper of the facets with two
     * differences, so that an element a patch does not touch comes back as it went: it keeps the empty texts that the
     * manifests hold (a tag, a label), which the mapper of the files leaves out, and it writes {@code replaces} as the
     * author wrote it (the kernel's warnings about a duplicate or an entry that is not a reference are told from that).
     */
    private ObjectMapper patchMapper() {
        val module = new SimpleModule();
        module.addSerializer(Replaces.class, new ReplacesAsWritten());
        return mapperFactory
            .create(MapperFormat.JSON)
            .copy()
            .setSerializationInclusion(Include.NON_NULL)
            .registerModule(module);
    }

    /** Writes {@code replaces} as the author wrote it, not as the set of the references it holds. */
    private static final class ReplacesAsWritten extends StdSerializer<Replaces> {

        ReplacesAsWritten() {
            super(Replaces.class);
        }

        @Override
        public void serialize(Replaces value, JsonGenerator generator, SerializerProvider provider) throws IOException {
            generator.writeTree(value.getWritten());
        }
    }

    /** A layer as the kernel takes it: {@code {"elements": [...]}}, whether or not it has any. */
    private static ObjectNode layerOf(ObjectMapper json, Object layer) {
        ObjectNode node = json.valueToTree(layer);
        if (!node.has("elements")) {
            node.putArray("elements");
        }
        return node;
    }

    /** A patch as the kernel reads it: the operator and the layer in the case it takes, the keys as the manifest writes them. */
    private static ObjectNode kernelPatch(ObjectMapper json, Patch patch) {
        val node = json.createObjectNode();
        node.put("operator", patch.getOperator().name());
        if (patch.getTarget() != null) {
            node.put("target", patch.getTarget());
        }
        if (patch.getLayer() != null) {
            node.put("layer", patch.getLayer().name().toLowerCase(Locale.ROOT));
        }
        if (patch.getJsonPath() != null) {
            node.put("json-path", patch.getJsonPath());
        }
        if (patch.getExpect() != null) {
            node.put("expect", patch.getExpect());
        }
        if (patch.getField() != null) {
            node.put("field", patch.getField());
        }
        if (patch.getWhere() != null) {
            val where = node.putObject("where");
            where.put("destination", patch.getWhere().getDestination());
            if (patch.getWhere().getLabel() != null) {
                where.put("label", patch.getWhere().getLabel());
            }
        }
        if (patch.getValue() != null) {
            node.set("value", patch.getValue());
        }
        return node;
    }

    private static Removal removal(String plateau, JsonNode report) {
        val dropped = new ArrayList<Removal.Dropped>();
        report.path("dropped").forEach(d -> {
            // a relationship is taken out as the object it was; the other entries are references
            val entry = d.path("entry");
            dropped.add(
                new Removal.Dropped(
                    d.path("layer").asText(),
                    d.path("reference").asText(),
                    d.path("field").asText(),
                    entry.isObject() ? entry.path("destination").asText() : entry.asText(),
                    entry.isObject() && entry.hasNonNull("label") ? entry.get("label").asText() : null
                )
            );
        });
        return new Removal(
            plateau,
            report.path("rank").asInt(),
            report.path("operator").asText(),
            report.path("selector").asText(),
            refs(report.path("touched")),
            refs(report.path("removed")),
            dropped
        );
    }

    private static List<Removal.Ref> refs(JsonNode list) {
        val out = new ArrayList<Removal.Ref>();
        list.forEach(r -> out.add(new Removal.Ref(r.path("layer").asText(), r.path("reference").asText())));
        return out;
    }

    // ---- the checks of a layer ----

    /** The elements declared under a parent the graph does not have. */
    private static List<String> parentProblems(
        String plateau,
        Indexes indexes,
        Map<Class<?>, Set<ManifestParser.Candidate>> added
    ) {
        val problems = new TreeMap<String, String>(); // by reference
        added.forEach((category, candidates) -> {
            val index = category == Application.class ? indexes.application() : indexes.technology();
            for (val candidate : candidates) {
                if (candidate.getParent() != null && index.searchElement(candidate.getParent()).isEmpty()) {
                    problems.put(
                        candidate.getReference(),
                        "in the plateau `" +
                            plateau +
                            "`, `" +
                            candidate.getReference() +
                            "` is declared under `" +
                            candidate.getParent() +
                            "`, which does not exist"
                    );
                }
            }
        });
        return foldParentProblems(problems.values().stream().toList());
    }

    /**
     * One sentence for the elements declared under a parent the graph does not have: they have one cause (a plateau that
     * overrides the wrong one, a manifest that was left out), so the first one is told, with how many others there are. The
     * editor says the same ({@code foldParentProblems} in {@code standalone.html}): keep them alike.
     */
    private static List<String> foldParentProblems(List<String> sentences) {
        if (sentences.size() < 2) {
            return sentences;
        }
        val others = sentences.size() - 1;
        return List.of(
            sentences.get(0) +
                " (" +
                others +
                (others == 1
                    ? " more element of the plateau is declared under a parent that does not exist"
                    : " more elements of the plateau are declared under a parent that does not exist") +
                ")"
        );
    }

    /** A reference that leads nowhere: who has it, what it points at, and the sentence. */
    private record Problem(String element, String other, String sentence) {}

    /** What the graph points at that is not there, by element and then by what it points at. */
    private static List<String> problems(String plateau, Indexes indexes) {
        val problems = new ArrayList<Problem>();
        val in = "in the plateau `" + plateau + "`, ";
        for (val index : List.of(indexes.application(), indexes.technology())) {
            new TreeMap<>(index.elementByReferenceIndex).forEach((reference, element) -> {
                for (val relationship : sorted(element.getRelationships(), r -> r.getDestination())) {
                    if (index.searchElement(relationship.getDestination()).isEmpty()) {
                        problems.add(
                            new Problem(
                                reference,
                                relationship.getDestination(),
                                in +
                                    "`" +
                                    reference +
                                    "` has a relationship towards `" +
                                    relationship.getDestination() +
                                    "`, which does not exist"
                            )
                        );
                    }
                }
                if (element instanceof Environment environment && environment.getUses() != null) {
                    for (val used : new TreeSet<>(environment.getUses())) {
                        if (index.searchElement(used).isEmpty()) {
                            problems.add(
                                new Problem(
                                    reference,
                                    used,
                                    in + "`" + reference + "` uses `" + used + "`, which does not exist"
                                )
                            );
                        }
                    }
                }
                if (element instanceof Node node && node.getApplications() != null) {
                    for (val application : new TreeSet<>(node.getApplications())) {
                        if (indexes.application().searchElement(application).isEmpty()) {
                            problems.add(
                                new Problem(
                                    reference,
                                    application,
                                    in + "`" + reference + "` hosts `" + application + "`, which does not exist"
                                )
                            );
                        }
                    }
                }
            });
        }
        // one sentence for each thing that is missing: the elements that point at it are one cause (the editor says the same:
        // `layerProblemsOf` in `standalone.html`)
        val byMissing = new LinkedHashMap<String, List<Problem>>();
        problems
            .stream()
            .sorted(
                Comparator.comparing(Problem::element).thenComparing(Problem::other).thenComparing(Problem::sentence)
            )
            .forEach(problem -> byMissing.computeIfAbsent(problem.other(), k -> new ArrayList<>()).add(problem));
        return byMissing
            .values()
            .stream()
            .map(group -> {
                val others = group.stream().map(Problem::element).distinct().count() - 1;
                val first = group.get(0).sentence();
                return others == 0
                    ? first
                    : first +
                          " (" +
                          others +
                          (others == 1
                              ? " more element of the plateau points at it)"
                              : " more elements of the plateau point at it)");
            })
            .toList();
    }

    private static <T> List<T> sorted(Set<T> set, java.util.function.Function<T, String> key) {
        return set == null ? List.of() : set.stream().sorted(Comparator.comparing(key)).toList();
    }

    /**
     * What the views and the stories name must exist in at least one plateau (the plateau-free check of issue #100): a name
     * the plateau drawn has is fine, and so is one that another plateau has and this one does not (the view then cannot be
     * drawn in this plateau, which is not a mistake of the view). "Another plateau has it" is decided from what the manifests
     * and {@code workspace.yaml} declare, whatever the plateau: a patch never creates an element, so the patches need not be
     * resolved for a plateau that is not drawn (the editor does the same, {@code entryProblemsOf}). The views come first, then
     * the stories, each in the order of the files; one sentence for each name.
     */
    private static List<String> entryProblems(ManifestParser.Parsed parsed, Indexes drawn, Workspace start) {
        val out = new ArrayList<String>();
        val declared = new Declared(parsed, start);
        // the views of workspace.yaml (an older place for them) are looked at after those of the manifests, unless a manifest
        // has the id (it shadows them, as it does in the editor)
        val manifestViews = new java.util.HashSet<String>();
        val views = new ArrayList<Entry<View>>();
        for (val placed : parsed.placedViews()) {
            manifestViews.add(placed.item().getId());
            views.add(new Entry<>(placed.source(), placed.item()));
        }
        start
            .getViews()
            .stream()
            .filter(view -> !manifestViews.contains(view.getId()))
            .forEach(view -> views.add(new Entry<>(LEGACY_SOURCE, view)));
        for (val entry : views) {
            checkNames("view", entry, entry.item().getLayer(), entry.item().getProperties(), drawn, declared, out);
        }
        for (val entry : storiesOf(parsed, start)) {
            val steps = entry.item().getSteps();
            for (int i = 0; i < steps.size(); i++) {
                val step = steps.get(i);
                out.addAll(
                    stepPlateauProblems(entry.source(), entry.item().getId(), i + 1, step, parsed.plateaus().ids())
                );
                checkNames("story", entry, step.getLayer(), step.getProperties(), drawn, declared, out);
            }
        }
        return out.stream().distinct().toList();
    }

    /** Where the views and the stories that an older workspace keeps in its workspace file are said to be. */
    private static final String LEGACY_SOURCE = "workspace.yaml";

    record Entry<T>(String source, T item) {}

    /** What the manifests and the workspace file declare, in any plateau, by layer; worked out the first time a name is missing from the plateau drawn. */
    private static final class Declared {

        private final ManifestParser.Parsed parsed;
        private final Workspace start;
        private Map<String, Set<String>> declared;

        Declared(ManifestParser.Parsed parsed, Workspace start) {
            this.parsed = parsed;
            this.start = start;
        }

        boolean has(View.Layer layer, String reference) {
            declared = declared == null ? declaredAnywhere(parsed, start) : declared;
            return declared.get(layerName(layer)).contains(reference);
        }
    }

    private static void checkNames(
        String noun,
        Entry<?> entry,
        View.Layer layer,
        JsonNode properties,
        Indexes drawn,
        Declared declared,
        List<String> out
    ) {
        val id = entry.item() instanceof View view ? view.getId() : ((Story) entry.item()).getId();
        for (val reference : named(properties)) {
            if (drawn.of(layer).searchElement(reference).isEmpty() && !declared.has(layer, reference)) {
                out.add(existsInNoPlateau(noun, id, entry.source(), reference));
            }
        }
    }

    /** The sentence of the plateau-free check; the editor says the same ({@code entryProblemsOf}): keep them alike. */
    private static String existsInNoPlateau(String noun, String id, String source, String reference) {
        return "the " + noun + " `" + id + "` (`" + source + "`) names `" + reference + "`, which exists in no plateau";
    }

    /**
     * The stories of the workspace with the file of each: those of the manifests, then those of {@code workspace.yaml} (an
     * older place for them) that no manifest shadows, as the editor lists them.
     */
    static List<Entry<Story>> storiesOf(ManifestParser.Parsed parsed, Workspace start) {
        val manifestStories = new java.util.HashSet<String>();
        val stories = new ArrayList<Entry<Story>>();
        for (val placed : parsed.placedStories()) {
            manifestStories.add(placed.item().getId());
            stories.add(new Entry<>(placed.source(), placed.item()));
        }
        start
            .getStories()
            .stream()
            .filter(story -> !manifestStories.contains(story.getId()))
            .forEach(story -> stories.add(new Entry<>(LEGACY_SOURCE, story)));
        return stories;
    }

    /**
     * What a step says about the plateau it is told at ({@code at}) and the plateau it is compared with ({@code against}),
     * wave 015 run 0101 (issue #24): each must be a plateau of the workspace, and they cannot be one plateau (a plateau is
     * never compared with itself). {@code against} with no {@code at} is read: the step is told at the plateau that is drawn.
     * An empty text names nothing, as a key with no value. The editor says the same sentences ({@code stepPlateauProblems}):
     * keep them alike.
     *
     * @param plateaus the ids of the plateaus of the workspace, empty when it has none
     */
    static List<String> stepPlateauProblems(
        String source,
        String id,
        int number,
        Story.Step step,
        List<String> plateaus
    ) {
        val out = new ArrayList<String>();
        val at = written(step.getAt());
        val against = written(step.getAgainst());
        val where = "the story `" + id + "` (`" + source + "`) step " + number + " says `";
        val unknown = new java.util.HashSet<String>();
        for (val pair : List.of(
            Map.entry("at", at == null ? "" : at),
            Map.entry("against", against == null ? "" : against)
        )) {
            val key = pair.getKey();
            val value = pair.getValue();
            if (value.isEmpty() || plateaus.contains(value)) {
                continue;
            }
            unknown.add(key);
            out.add(
                plateaus.isEmpty()
                    ? where +
                          key +
                          ": " +
                          value +
                          "` but the workspace declares no plateau" +
                          WorkspaceFactory.NO_PLATEAU
                    : where +
                          key +
                          ": " +
                          value +
                          "`, which is not a plateau of this workspace (the plateaus are " +
                          plateaus
                              .stream()
                              .map(i -> "`" + i + "`")
                              .collect(java.util.stream.Collectors.joining(", ")) +
                          ")"
            );
        }
        if (at != null && at.equals(against) && unknown.isEmpty()) {
            out.add(where + "at: " + at + "` and `against: " + against + "`: a plateau is never compared with itself");
        }
        return out;
    }

    private static String written(String value) {
        return value == null || value.isEmpty() ? null : value;
    }

    private static String layerName(View.Layer layer) {
        return layer == View.Layer.TECHNOLOGY ? "technology" : "application";
    }

    /** The references the manifests declare in any plateau, and those of {@code workspace.yaml}, by layer. */
    private static Map<String, Set<String>> declaredAnywhere(ManifestParser.Parsed parsed, Workspace start) {
        val declared = new LinkedHashMap<String, Set<String>>();
        declared.put("application", new TreeSet<>(parsed.declared().getOrDefault("application", Set.of())));
        declared.put("technology", new TreeSet<>(parsed.declared().getOrDefault("technology", Set.of())));
        declared
            .get("application")
            .addAll(
                ElementIndexFactory.builder()
                    .root(start.getApplication())
                    .candidates(Set.of())
                    .build()
                    .create()
                    .elementByReferenceIndex.keySet()
            );
        declared
            .get("technology")
            .addAll(
                ElementIndexFactory.builder()
                    .root(start.getTechnology())
                    .candidates(Set.of())
                    .build()
                    .create()
                    .elementByReferenceIndex.keySet()
            );
        return declared;
    }

    /** The references the properties of a view name: {@code element}, and the entries of {@code pinned}, {@code opened} and {@code hidden}. */
    private static Set<String> named(JsonNode properties) {
        val out = new TreeSet<String>();
        if (properties == null || !properties.isObject()) {
            return out;
        }
        if (properties.path("element").isTextual()) {
            out.add(properties.get("element").asText());
        }
        for (val key : List.of("pinned", "opened", "hidden")) {
            properties.path(key).forEach(entry -> {
                if (entry.isTextual()) {
                    out.add(entry.asText());
                }
            });
        }
        return out;
    }
}

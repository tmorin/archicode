package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.Warnings;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.manifest.ManifestParser;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.plateau.Patch;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.val;

/**
 * Folds a plateau into the plateau above it (wave 028, runs 0207 and 0208, issue #65). It reads the facts of a workspace and
 * hands them to {@link Fold}; it rewrites the manifests the plan names with {@link FoldRewrite}; it proves on a temporary
 * copy, with {@link FoldCheck}, that every plateau that remains reads the same; and only then, and only when it is asked to
 * write, hands the new bytes to {@link FoldFiles#commit}. It knows no command line: the command and a later endpoint call it.
 */
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class PlateauFoldService {

    WorkspaceFactory workspaceFactory;
    MapperFactory mapperFactory;
    Warnings warnings;

    /**
     * What folding a plateau into the plateau above it would do.
     *
     * @param workspaceFile the workspace file
     * @param id            the plateau to fold
     * @return the plan
     * @throws io.morin.archicode.ArchiCodeException with the sentence of a refusal, or of the loader
     */
    public Fold.Plan plan(Path workspaceFile, String id) {
        return plan(workspaceFile, workspaceFactory.facts(workspaceFile), id);
    }

    private Fold.Plan plan(Path workspaceFile, WorkspaceFactory.Facts facts, String id) {
        val parsed = facts.parsed();
        val tree = parsed.plateaus();
        val steps = new ArrayList<Fold.StepNaming>();
        for (val placed : parsed.placedStories()) {
            val story = placed.item();
            val list = story.getSteps();
            for (var i = 0; i < list.size(); i++) {
                val step = list.get(i);
                val at = written(step.getAt());
                val against = written(step.getAgainst());
                if (at != null || against != null) {
                    steps.add(new Fold.StepNaming(story.getId(), placed.source(), i + 1, at, against));
                }
            }
        }
        return Fold.plan(id, tree, facts.current(), steps, () ->
            // only called when the plateau has exactly one plateau above it
            composition(workspaceFile, parsed, id, tree.children(id).get(0).id())
        );
    }

    /**
     * Folds a plateau into the plateau above it, or says what the fold would do. The plan is made first (the refusals), the
     * manifests it names are rewritten in memory, and the plateaus that remain are read before and after on a temporary copy;
     * the workspace folder is not touched unless every plateau reads the same and {@code write} is true.
     *
     * @param workspaceFile the workspace file
     * @param id            the plateau to fold
     * @param write         whether to write the files; false is the dry run, which does everything but the write
     * @param files         the operations that change the folder, handed to {@link FoldFiles#commit}; not called when
     *                      {@code write} is false
     * @return the plan, what was compared, and whether the files were written
     * @throws ArchiCodeException with the sentence of a refusal, of the loader, of the check, or of a failed write
     */
    public FoldCheck.Folded fold(Path workspaceFile, String id, boolean write, FoldFiles files) {
        val facts = workspaceFactory.facts(workspaceFile);
        val plan = plan(workspaceFile, facts, id);
        val folder = workspaceFile.toAbsolutePath().normalize().getParent();

        // the bytes of every file the plan names, read once, and the manifests they hold
        val read = new LinkedHashMap<String, byte[]>();
        val manifests = new LinkedHashMap<String, Manifest>();
        Stream.concat(plan.rewritten().stream(), plan.deleted().stream()).forEach(path -> {
            val bytes = bytesOf(folder.resolve(path));
            read.put(path, bytes);
            manifests.put(path, manifestOf(path, bytes));
        });
        val rewritten = FoldRewrite.apply(plan, manifests);
        val written = new LinkedHashMap<String, byte[]>();
        rewritten.written().forEach((path, manifest) -> written.put(path, textOf(path, manifest)));

        val remaining = facts
            .parsed()
            .plateaus()
            .ids()
            .stream()
            .filter(other -> !other.equals(id))
            .sorted()
            .toList();
        val snapshots = new FoldSnapshots(
            mapperFactory.create(MapperFormat.JSON),
            new PlateauComparer(mapperFactory.createLazy(MapperFormat.JSON))
        );
        // sentence 7: a plateau that remains does not load as it is: the loader's own line
        val before = snapshots.take(remaining, plateau -> workspaceFactory.create(workspaceFile, null, plateau), false);
        val after = copied(folder, workspaceFile, facts, read, written, rewritten.deleted(), copy ->
            warnings.silently(() -> afterSnapshot(snapshots, plan, remaining, copy))
        );
        FoldCheck.firstDifference(plan, before, after).ifPresent(sentence -> {
            throw new ArchiCodeException(sentence);
        });

        val check = new FoldCheck.Check(remaining.size(), remaining.size() * (remaining.size() - 1));
        if (write) {
            FoldFiles.commit(files, folder, read, written, rewritten.deleted());
        }
        return new FoldCheck.Folded(plan, check, write);
    }

    /** Sentence 8: a plateau that remains does not load on the copy. */
    private FoldCheck.Snapshot afterSnapshot(
        FoldSnapshots snapshots,
        Fold.Plan plan,
        List<String> remaining,
        Path copy
    ) {
        val current = new String[1];
        try {
            return snapshots.take(
                remaining,
                plateau -> {
                    current[0] = plateau;
                    return workspaceFactory.create(copy, null, plateau);
                },
                true
            );
        } catch (ArchiCodeException e) {
            throw because(
                e,
                "the fold of `%s` into `%s` would leave the plateau `%s` unreadable: %s: no file is written",
                plan.folded(),
                plan.into(),
                current[0],
                e.getMessage()
            );
        }
    }

    /**
     * Builds the temporary copy of the workspace (the workspace file and every manifest the loader discovers, with the new
     * texts applied and the deleted files left out), hands it to {@code use}, and removes it whatever happens.
     */
    private <T> T copied(
        Path folder,
        Path workspaceFile,
        WorkspaceFactory.Facts facts,
        Map<String, byte[]> read,
        Map<String, byte[]> written,
        List<String> deleted,
        java.util.function.Function<Path, T> use
    ) {
        Path copy = null;
        try {
            copy = Files.createTempDirectory("archicode-fold-");
            val target = copy.resolve(workspaceFile.getFileName());
            Files.copy(workspaceFile, target);
            for (val file : facts.manifestFiles()) {
                val relative = folder.relativize(file.toAbsolutePath().normalize()).toString().replace('\\', '/');
                if (deleted.contains(relative)) {
                    continue;
                }
                val bytes = written.containsKey(relative)
                    ? written.get(relative)
                    : read.containsKey(relative)
                      ? read.get(relative)
                      : Files.readAllBytes(file);
                val place = copy.resolve(relative);
                Files.createDirectories(place.getParent());
                Files.write(place, bytes);
            }
            return use.apply(target);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            remove(copy);
        }
    }

    private static void remove(Path folder) {
        if (folder == null) {
            return;
        }
        try (Stream<Path> walk = Files.walk(folder)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // a temporary file that stays is in the system temporary folder, not in the workspace
                }
            });
        } catch (IOException ignored) {
            // the same: nothing in the workspace depends on it
        }
    }

    private static byte[] bytesOf(Path file) {
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw because(e, "the file `%s` cannot be read: %s", file.getFileName(), e.getMessage());
        }
    }

    private Manifest manifestOf(String path, byte[] bytes) {
        try {
            return mapperFactory.create(formatOf(path)).readValue(bytes, Manifest.class);
        } catch (IOException e) {
            throw because(e, "`%s` is not valid: %s", path, e.getMessage());
        }
    }

    private byte[] textOf(String path, Manifest manifest) {
        try {
            var text = mapperFactory.forWriting(formatOf(path)).writeValueAsString(manifest);
            if (!text.endsWith("\n")) {
                text += "\n";
            }
            return text.getBytes(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw because(e, "`%s` cannot be written: %s", path, e.getMessage());
        }
    }

    /** The sentence for the author, with the failure it comes from kept as its cause. */
    private static ArchiCodeException because(Throwable cause, String message, Object... args) {
        val failure = new ArchiCodeException(message, args);
        failure.initCause(cause);
        return failure;
    }

    private static MapperFormat formatOf(String path) {
        return MapperFormat.resolve(path).orElseThrow(() ->
            new ArchiCodeException("`%s` is not a manifest of a format this tool reads", path)
        );
    }

    private Fold.Composition composition(Path workspaceFile, ManifestParser.Parsed parsed, String folded, String into) {
        val declared = new LinkedHashMap<String, String>();
        val intoEntries = new ArrayList<Fold.Entry>();
        val candidates = parsed
            .elements()
            .values()
            .stream()
            .flatMap(Set::stream)
            .sorted(
                Comparator.comparing((ManifestParser.Candidate c) ->
                    c.getSource() == null ? "" : c.getSource()
                ).thenComparing(ManifestParser.Candidate::getReference)
            )
            .toList();
        for (val candidate : candidates) {
            if (candidate.getPlateau().equals(folded)) {
                walk(candidate.getReference(), candidate.getElement(), (reference, element) ->
                    declared.put(reference, candidate.getSource())
                );
            } else if (candidate.getPlateau().equals(into)) {
                walk(candidate.getReference(), candidate.getElement(), (reference, element) -> {
                    if (!element.getReplaces().isEmpty()) {
                        intoEntries.add(
                            new Fold.Entry(candidate.getSource(), reference, List.copyOf(element.getReplaces()))
                        );
                    }
                });
            }
        }
        val patches = parsed.plateaus().node(into).patches();
        for (var i = 0; i < patches.size(); i++) {
            val patch = patches.get(i);
            val replaces = replacesSetBy(patch);
            if (!replaces.isEmpty()) {
                val element = patch.hasTarget() ? patch.getTarget() : patch.getJsonPath();
                intoEntries.add(new Fold.Entry("patch " + (i + 1) + " of `" + into + "`", element, replaces));
            }
        }

        // what each element the folded plateau declares replaces once its own patches are applied
        val replaced = new LinkedHashMap<String, List<String>>();
        val loaded = workspaceFactory.create(workspaceFile, null, into);
        loaded
            .getSteps()
            .stream()
            .filter(step -> step.plateau().equals(folded))
            .findFirst()
            .ifPresent(step ->
                declared
                    .keySet()
                    .forEach(reference ->
                        Optional.ofNullable(replacesIn(step, reference)).ifPresent(r -> replaced.put(reference, r))
                    )
            );
        return new Fold.Composition(new TreeSet<>(declared.keySet()), replaced, intoEntries);
    }

    private static List<String> replacesIn(PlateauStep step, String reference) {
        return step
            .application()
            .searchElement(reference)
            .or(() -> step.technology().searchElement(reference))
            .map(element -> List.copyOf(element.getReplaces()))
            .filter(list -> !list.isEmpty())
            .orElse(null);
    }

    private static List<String> replacesSetBy(Patch patch) {
        if (
            patch.getOperator() != Patch.Operator.SET ||
            !"replaces".equals(patch.getField()) ||
            patch.getValue() == null
        ) {
            return List.of();
        }
        val value = patch.getValue();
        val out = new LinkedHashSet<String>();
        if (value.isArray()) {
            for (JsonNode item : value) {
                if (item.isTextual()) {
                    out.add(item.asText());
                }
            }
        } else if (value.isTextual()) {
            out.add(value.asText());
        }
        return List.copyOf(out);
    }

    /** Visits an element and everything nested in it, with the full reference of each. */
    private static void walk(String reference, Element element, java.util.function.BiConsumer<String, Element> visit) {
        visit.accept(reference, element);
        if (element instanceof Parent<?> parent) {
            for (Element child : parent.getElements()) {
                walk(reference + "." + child.getId(), child, visit);
            }
        }
    }

    private static String written(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}

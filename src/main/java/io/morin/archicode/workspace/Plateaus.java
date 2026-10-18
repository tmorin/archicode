package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.manifest.ManifestDiscovery;
import io.morin.archicode.resource.workspace.Settings;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * The plateaus of a workspace: what {@code settings.plateaus} may hold, which plateau is drawn, and the folder it is read
 * from. The rules, and their words, are the ones of the editor ({@code validatePlateaus} in {@code standalone.html}):
 * keep them alike.
 * <p>
 * A workspace without {@code plateaus} has one set of manifests, {@code settings.manifests.paths}, and is read as it
 * always was; the only new rule for it is that a path may not leave the folder of the workspace.
 */
@UtilityClass
public class Plateaus {

    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_][A-Za-z0-9_.-]*");
    private static final Pattern DRIVE = Pattern.compile("^[A-Za-z]:.*");
    private static final Set<String> KEYS = Set.of("id", "name", "horizon", "path", "baseline");

    /**
     * The plateau that is read, and the folder it is read from.
     *
     * @param plateau the plateau
     * @param path    its folder, relative to the folder of the workspace, normalised (no {@code .} segment, no trailing
     *                slash; empty for the folder of the workspace itself)
     */
    public record Selection(Settings.Plateau plateau, String path) {}

    /**
     * Check what the keys of the plateaus of the raw {@code settings.plateaus} say before it is read as a model: a
     * plateau is a mapping of {@code id}, {@code name}, {@code horizon} and {@code path}, and {@code from} is reserved.
     *
     * @param plateaus the raw {@code settings.plateaus}, or a missing node
     * @return the problems, one message each; empty when there is none
     */
    public static List<String> checkStructure(JsonNode plateaus) {
        val problems = new ArrayList<String>();
        if (plateaus == null || plateaus.isMissingNode() || plateaus.isNull()) {
            return problems;
        }
        if (!plateaus.isArray()) {
            problems.add("`settings.plateaus` must be a list of plateaus, each with an `id` and a `path`");
            return problems;
        }
        int number = 0;
        for (JsonNode plateau : plateaus) {
            number++;
            if (!plateau.isObject()) {
                problems.add(
                    "the plateau number " +
                        number +
                        " of `settings.plateaus` must be a mapping with an `id` and a `path`"
                );
                continue;
            }
            val id = plateau.path("id").isValueNode() ? plateau.path("id").asText("") : "";
            val label = id.isBlank() ? "the plateau number " + number : "the plateau `" + id + "`";
            // the keys in the order the author wrote them
            val names = new ArrayList<String>();
            plateau.fieldNames().forEachRemaining(names::add);
            for (val key : names) {
                if (key.equals("from")) {
                    problems.add(
                        label +
                            " has a `from`: it is reserved for a later version of ArchiCode, where a plateau will be an" +
                            " increment on top of another one, and is not accepted yet. Remove it and give the plateau its" +
                            " own `path`, holding all its manifests (`archicode plateau add` copies a plateau into a new" +
                            " folder)"
                    );
                } else if (!KEYS.contains(key)) {
                    problems.add(
                        label +
                            " has the key `" +
                            key +
                            "`, which ArchiCode does not know: a plateau has `id`, `name`, `horizon`, `path` and `baseline`"
                    );
                }
            }
        }
        return problems;
    }

    /**
     * Choose the plateau to read, after checking every rule on the plateaus.
     *
     * @param settings             the settings of the workspace
     * @param manifestsPathsWritten whether the author wrote {@code settings.manifests.paths} (the default is not
     *                              written, and does not count)
     * @param requested            the plateau asked for ({@code --plateau}), or null
     * @return the plateau to read, or null when the workspace has no plateaus (one set of manifests,
     * {@code manifests.paths})
     * @throws ArchiCodeException with every problem found, one per line
     */
    public static Selection select(Settings settings, boolean manifestsPathsWritten, String requested) {
        val plateaus = settings.getPlateaus() == null ? List.<Settings.Plateau>of() : settings.getPlateaus();
        val problems = new ArrayList<String>();

        if (plateaus.isEmpty()) {
            for (val path : new TreeSet<>(settings.getManifests().getPaths())) {
                val problem = pathProblem(path);
                if (problem != null) {
                    problems.add(manifestsPathMessage(path, problem));
                } else if (ManifestDiscovery.patternProblem(path) != null) {
                    problems.add(
                        "the path `" +
                            path +
                            "` of `settings.manifests.paths` " +
                            ManifestDiscovery.patternProblem(path)
                    );
                }
            }
            if (settings.getCurrent() != null) {
                problems.add(
                    "`settings.current` is `" +
                        settings.getCurrent() +
                        "` but the workspace declares no `settings.plateaus`"
                );
            }
            if (requested != null) {
                problems.add(
                    "`--plateau " + requested + "` cannot be used: the workspace declares no `settings.plateaus`"
                );
            }
            fail(problems);
            return null;
        }

        if (manifestsPathsWritten) {
            problems.add(
                "`settings.manifests.paths` and `settings.plateaus` are both written: choose one. `manifests.paths` is" +
                    " the short form of a workspace with a single set of manifests; with `settings.plateaus`, give each" +
                    " plateau its own `path` and remove `manifests.paths`"
            );
        }

        val ids = new HashMap<String, Integer>();
        val paths = new HashMap<String, String>(); // normalised path -> id of the first plateau that has it
        val reportedIds = new TreeSet<String>();
        int number = 0;
        for (val plateau : plateaus) {
            number++;
            val id = plateau.getId() == null ? "" : plateau.getId();
            val label = id.isBlank() ? "the plateau number " + number : "the plateau `" + id + "`";
            if (id.isBlank()) {
                problems.add(label + " has no `id`");
            } else if (!ID.matcher(id).matches()) {
                problems.add(
                    "the plateau id `" +
                        id +
                        "` is not valid: use letters, digits, `.`, `_` and `-`, starting with a letter, a digit or `_`"
                );
            } else if (ids.merge(id, 1, Integer::sum) == 2) {
                reportedIds.add(id);
            }

            val path = plateau.getPath();
            if (path == null || path.isBlank()) {
                problems.add(
                    label +
                        " has no `path`: write the folder of its manifests, relative to the folder of workspace.yaml (for" +
                        " example `plateaus/" +
                        (id.isBlank() ? "p1" : id) +
                        "`)"
                );
                continue;
            }
            val problem = pathProblem(path);
            if (problem != null) {
                problems.add(
                    "the path `" +
                        path +
                        "` of " +
                        label +
                        " " +
                        problem +
                        ": it must be a folder below the one of workspace.yaml, written relative to it, without `..` (for" +
                        " example `plateaus/" +
                        (id.isBlank() ? "p1" : id) +
                        "`)"
                );
                continue;
            }
            val normalised = normalize(path);
            if (normalised.isEmpty() && plateaus.size() > 1) {
                problems.add(
                    label +
                        " has the path `" +
                        path +
                        "`, which is the folder of workspace.yaml itself and holds the others: with several plateaus, give" +
                        " each one a folder of its own"
                );
            }
            val first = paths.putIfAbsent(normalised, id);
            if (first != null && !normalised.isEmpty()) {
                problems.add(
                    "the plateaus `" +
                        first +
                        "` and `" +
                        id +
                        "` share the path `" +
                        normalised +
                        "`: each plateau needs a folder of its own"
                );
            }
        }
        reportedIds.forEach(id -> problems.add("the plateau id `" + id + "` is used more than once"));
        for (val plateau : plateaus) {
            val baseline = plateau.getBaseline();
            if (baseline == null) {
                continue;
            }
            val label = "the plateau `" + plateau.getId() + "`";
            if (baseline.equals(plateau.getId())) {
                problems.add(label + " names itself as its `baseline`: choose another plateau to compare it with");
            } else if (plateaus.stream().noneMatch(p -> baseline.equals(p.getId()))) {
                problems.add(
                    label +
                        " has the `baseline` `" +
                        baseline +
                        "`, which is not in `settings.plateaus` (" +
                        plateaus
                            .stream()
                            .map(p -> "`" + p.getId() + "`")
                            .collect(Collectors.joining(", ")) +
                        ")"
                );
            }
        }
        fail(problems);

        val idList = plateaus
            .stream()
            .map(p -> "`" + p.getId() + "`")
            .collect(Collectors.joining(", "));
        val current = settings.getCurrent();
        if (current != null && plateaus.stream().noneMatch(p -> p.getId().equals(current))) {
            throw new ArchiCodeException(
                "`settings.current` names the plateau `%s`, which is not in `settings.plateaus` (%s)",
                current,
                idList
            );
        }
        val wanted = requested != null ? requested : current;
        if (wanted == null) {
            val last = plateaus.get(plateaus.size() - 1);
            return new Selection(last, normalize(last.getPath()));
        }
        val chosen = plateaus
            .stream()
            .filter(p -> p.getId().equals(wanted))
            .findFirst()
            .orElseThrow(() ->
                new ArchiCodeException("unknown plateau `%s`: the plateaus of this workspace are %s", wanted, idList)
            );
        return new Selection(chosen, normalize(chosen.getPath()));
    }

    /**
     * The plateau a plateau is compared with: the one asked for ({@code --baseline}), else the {@code baseline} the
     * plateau names, else the plateau before it in the list. The first plateau, with nothing before it, has none.
     *
     * @param settings  the settings of the workspace, whose plateaus have been checked by {@link #select}
     * @param plateau   the plateau that is compared
     * @param requested the baseline asked for ({@code --baseline}), or null
     * @return the baseline, or null when there is nothing to compare the plateau with
     * @throws ArchiCodeException when {@code requested} is not a plateau of the workspace, or is the plateau itself
     */
    public static Settings.Plateau baseline(Settings settings, Settings.Plateau plateau, String requested) {
        val plateaus = settings.getPlateaus() == null ? List.<Settings.Plateau>of() : settings.getPlateaus();
        if (requested != null) {
            val found = plateaus
                .stream()
                .filter(p -> p.getId().equals(requested))
                .findFirst()
                .orElseThrow(() ->
                    new ArchiCodeException(
                        "unknown baseline `%s`: the plateaus of this workspace are %s",
                        requested,
                        plateaus
                            .stream()
                            .map(p -> "`" + p.getId() + "`")
                            .collect(Collectors.joining(", "))
                    )
                );
            if (found.getId().equals(plateau.getId())) {
                throw new ArchiCodeException(
                    "the baseline `%s` is the plateau that is compared: choose another plateau to compare it with",
                    requested
                );
            }
            return found;
        }
        if (plateau.getBaseline() != null) {
            return plateaus
                .stream()
                .filter(p -> p.getId().equals(plateau.getBaseline()))
                .findFirst()
                .orElseThrow(() ->
                    new ArchiCodeException(
                        "the plateau `%s` has the `baseline` `%s`, which is not in `settings.plateaus`",
                        plateau.getId(),
                        plateau.getBaseline()
                    )
                );
        }
        val index = plateaus.indexOf(plateau);
        return index > 0 ? plateaus.get(index - 1) : null;
    }

    private static void fail(List<String> problems) {
        if (!problems.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", problems));
        }
    }

    private static String manifestsPathMessage(String path, String problem) {
        return (
            "the path `" +
            path +
            "` of `settings.manifests.paths` " +
            problem +
            ": a manifests folder must be below the folder of workspace.yaml, written relative to it, without `..`." +
            " Move the folder below workspace.yaml (or move workspace.yaml up, to a folder that holds both) and change" +
            " the path to match"
        );
    }

    /** Whether the text is an identifier a plateau may have. */
    public static boolean isValidId(String id) {
        return id != null && ID.matcher(id).matches();
    }

    /**
     * Why a path may not name the folder of a plateau or of manifests, or null when it may: it is empty, absolute (a
     * leading slash or backslash, or a drive letter) or goes up with a {@code ..} segment (either slash).
     */
    public static String pathProblem(String path) {
        if (path == null || path.isBlank()) {
            return "is empty";
        }
        if (path.startsWith("/") || path.startsWith("\\") || DRIVE.matcher(path).matches()) {
            return "is absolute";
        }
        for (val segment : path.split("[/\\\\]", -1)) {
            if (segment.equals("..")) {
                return "contains `..`";
            }
        }
        return null;
    }

    /**
     * A relative path as ArchiCode compares it: the segments joined with {@code /}, the empty and {@code .} ones
     * dropped ({@code ./plateaus/a/} and {@code plateaus/a} are one folder; {@code .} is the folder of the workspace,
     * the empty string).
     */
    public static String normalize(String path) {
        return Arrays.stream(path.split("[/\\\\]"))
            .filter(segment -> !segment.isEmpty() && !segment.equals("."))
            .collect(Collectors.joining("/"));
    }
}

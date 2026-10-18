package io.morin.archicode.manifest;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFormat;
import java.io.File;
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.regex.Pattern;
import lombok.val;

/**
 * Where the manifests are: the files that the entries of {@code settings.manifests.paths} name. The editor reads the same
 * entries by the same rules ({@code readManifestFolder} in {@code standalone.html}); one list of cases, {@code
 * discovery-cases.json}, is run by both, so keep them alike.
 *
 * <ul>
 *   <li>An entry that does not end in {@code /**} names a folder, and the files directly in it are read (the manifests
 *       folder of every version before the layers). A folder that does not exist reads nothing.
 *   <li>An entry that ends in {@code /**} ({@code manifests/**}, or {@code ./**} for the folder of {@code
 *       workspace.yaml}) is read recursively. Below its folder, nothing is read in a folder or a file whose name begins
 *       with a dot, in a symbolic link to a folder (a link is never followed, so that a loop cannot happen; a link to a
 *       file is a file), or in the folder of the generated views: {@link #excludesViews the folder named by {@code
 *       views.path} and its siblings that begin with its name and a dash}, which is where the views of a plateau
 *       ({@code views-to-be}), of a comparison ({@code views-to-be-vs-as-is}) and of a facet ({@code views-shop})
 *       are written, and which hold a {@code gap.json} that is no manifest.
 *   <li>{@code **} means something only at the end of an entry, after a {@code /}. Anywhere else it is an error, told in
 *       one line, not a pattern that matches nothing.
 *   <li>The files are listed once, whichever entries find them, sorted by their path from the folder of the workspace,
 *       written with {@code /}, compared by Unicode code point (so: independent of the file system, which lists files
 *       in any order, and of the locale). No normalisation of the names is applied.
 * </ul>
 */
public final class ManifestDiscovery {

    /** What ends an entry that is read recursively. */
    public static final String RECURSIVE = "/**";

    private ManifestDiscovery() {}

    /** Whether the entry is read recursively. */
    public static boolean isRecursive(String entry) {
        return entry.endsWith(RECURSIVE);
    }

    /**
     * The folder an entry names: the entry without its {@code /**}, if it has one.
     *
     * @param entry an entry of {@code settings.manifests.paths}
     * @return the folder, as written
     */
    public static String folderOf(String entry) {
        return isRecursive(entry) ? entry.substring(0, entry.length() - RECURSIVE.length()) : entry;
    }

    /**
     * What is wrong with the use of {@code **} in an entry, or null: {@code **} is read at the end of an entry, after a
     * {@code /}, and nowhere else.
     *
     * @param entry an entry of {@code settings.manifests.paths}
     * @return the reason, which is the end of the sentence that begins with the path, or null
     */
    public static String patternProblem(String entry) {
        if (folderOf(entry).contains("**")) {
            return (
                "uses `**` where ArchiCode does not read it: only a path that ends in `/**` is read recursively" +
                " (`manifests/**`, or `./**` for the folder of workspace.yaml), and `**` means nothing anywhere else." +
                " Write one path for each folder, or end the path with `/**`"
            );
        }
        return null;
    }

    private static final Pattern DRIVE = Pattern.compile("^[A-Za-z]:.*");

    /**
     * Why a path may not name a folder of manifests, or null when it may: it is empty, absolute (a leading slash or backslash,
     * or a drive letter) or goes up with a {@code ..} segment (either slash).
     *
     * @param path an entry of {@code settings.manifests.paths}
     * @return the reason, which is the end of the sentence that begins with the path, or null
     */
    public static String pathProblem(String path) {
        if (path == null || path.isBlank()) {
            return "is empty";
        }
        if (path.startsWith("/") || path.startsWith("\\") || DRIVE.matcher(path).matches()) {
            return "is absolute";
        }
        for (String segment : path.split("[/\\\\]", -1)) {
            if (segment.equals("..")) {
                return "contains `..`";
            }
        }
        return null;
    }

    /**
     * What is wrong with the entries of {@code settings.manifests.paths} before any is read: a path that leaves the folder of
     * the workspace, or uses {@code **} where it is not read. The rules, and their words, are the ones of the editor
     * ({@code manifestsPathSentence} in {@code standalone.html}): keep them alike.
     *
     * @param paths the entries of {@code settings.manifests.paths}
     * @return one sentence for each entry that is wrong, in the order of the sorted entries; empty when they are right
     */
    public static List<String> pathProblems(Collection<String> paths) {
        val problems = new ArrayList<String>();
        for (String path : new TreeSet<>(paths)) {
            val problem = pathProblem(path);
            if (problem != null) {
                problems.add(
                    "the path `" +
                        path +
                        "` of `settings.manifests.paths` " +
                        problem +
                        ": a manifests folder must be below the folder of workspace.yaml, written relative to it, without `..`." +
                        " Move the folder below workspace.yaml (or move workspace.yaml up, to a folder that holds both) and change" +
                        " the path to match"
                );
            } else if (patternProblem(path) != null) {
                problems.add("the path `" + path + "` of `settings.manifests.paths` " + patternProblem(path));
            }
        }
        return problems;
    }

    /**
     * The path as ArchiCode compares it: the segments, the empty and {@code .} ones dropped.
     *
     * @param path a path written with {@code /}
     * @return the segments
     */
    static List<String> segments(String path) {
        return Arrays.stream(path.split("/"))
            .filter(s -> !s.isEmpty() && !s.equals("."))
            .toList();
    }

    /**
     * Whether a folder found below the entry is one of the generated views. {@code views.path} is read as it is written in
     * {@code workspace.yaml}: it is the beginning of the name of every folder the tools write ({@code views}, {@code
     * views-<plateau>}, {@code views-<plateau>-vs-<against>}, {@code views-<facet>}); a folder that is somewhere else, or
     * that an {@code --output} option named otherwise, is not known to the tools that read the manifests.
     *
     * @param folder    the folder, from the folder of the workspace
     * @param viewsPath {@code settings.views.path}
     * @return whether the folder is the views folder or begins like it
     */
    static boolean excludesViews(List<String> folder, String viewsPath) {
        if (viewsPath == null || viewsPath.startsWith("/") || viewsPath.startsWith("\\")) {
            return false;
        }
        val views = segments(viewsPath);
        if (views.isEmpty() || views.contains("..") || folder.size() != views.size()) {
            return false;
        }
        for (int i = 0; i < views.size() - 1; i++) {
            if (!views.get(i).equals(folder.get(i))) {
                return false;
            }
        }
        val name = views.get(views.size() - 1);
        val found = folder.get(folder.size() - 1);
        return found.equals(name) || found.startsWith(name + "-");
    }

    /**
     * Compare two paths by Unicode code point.
     *
     * @param a a path
     * @param b a path
     * @return the order of the two
     */
    public static int compare(String a, String b) {
        int i = 0;
        int j = 0;
        while (i < a.length() && j < b.length()) {
            val x = a.codePointAt(i);
            val y = b.codePointAt(j);
            if (x != y) {
                return Integer.compare(x, y);
            }
            i += Character.charCount(x);
            j += Character.charCount(y);
        }
        return Integer.compare(a.length() - i, b.length() - j);
    }

    /**
     * The manifest files that the entries name, once each, sorted.
     *
     * @param wksDir        the folder of the workspace
     * @param entries       the entries of {@code settings.manifests.paths}
     * @param viewsPath     {@code settings.views.path}
     * @param workspaceFile the workspace file, which is not a manifest of itself, or null
     * @return the files, sorted by their path from {@code wksDir}
     */
    public static List<Path> discover(Path wksDir, Collection<String> entries, String viewsPath, Path workspaceFile) {
        // by the path as the messages write it, which is also the key of the sort
        val found = new LinkedHashMap<Path, Path>();
        for (val entry : entries) {
            val folder = wksDir.resolve(folderOf(entry));
            if (!folder.toFile().exists()) {
                continue;
            }
            if (isRecursive(entry)) {
                walk(folder, new ArrayList<>(segments(folderOf(entry))), viewsPath, found, wksDir);
            } else {
                val files = Arrays.stream(
                    Optional.ofNullable(
                        folder.toFile().listFiles((dir, name) -> MapperFormat.resolve(name).isPresent())
                    ).orElseThrow(() -> new ArchiCodeException("unable to read the path %s", folder))
                )
                    .map(File::toPath)
                    .toList();
                files.forEach(file -> found.putIfAbsent(file.toAbsolutePath().normalize(), file));
            }
        }
        val skipped = workspaceFile == null ? null : workspaceFile.toAbsolutePath().normalize();
        val files = new ArrayList<Path>();
        found.forEach((key, file) -> {
            if (!key.equals(skipped)) {
                files.add(file);
            }
        });
        files.sort((a, b) -> compare(name(wksDir, a), name(wksDir, b)));
        return files;
    }

    /** The path of a file from the folder of the workspace, with {@code /} on every system. */
    private static String name(Path wksDir, Path file) {
        return ManifestParser.sourceOf(wksDir, file);
    }

    private static void walk(Path folder, List<String> relative, String viewsPath, Map<Path, Path> found, Path wksDir) {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(folder)) {
            for (val entry : stream) {
                val name = entry.getFileName().toString();
                if (name.startsWith(".")) {
                    continue;
                }
                if (Files.isDirectory(entry, LinkOption.NOFOLLOW_LINKS)) {
                    val below = new ArrayList<>(relative);
                    below.add(name);
                    if (!excludesViews(below, viewsPath)) {
                        walk(entry, below, viewsPath, found, wksDir);
                    }
                } else if (Files.isSymbolicLink(entry) && Files.isDirectory(entry)) {
                    continue; // a link to a folder is not followed
                } else if (MapperFormat.resolve(name).isPresent()) {
                    found.putIfAbsent(entry.toAbsolutePath().normalize(), entry);
                }
            }
        } catch (IOException e) {
            throw new ArchiCodeException("unable to read the path %s", name(wksDir, folder));
        }
    }
}

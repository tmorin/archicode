package io.morin.archicode.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * Add a plateau to a workspace: copy the folder of an existing plateau into a new folder and append the entry to
 * {@code settings.plateaus} of {@code workspace.yaml}.
 * <p>
 * The entry is written by inserting lines in the text of the file, not by writing the workspace again: the comments, the
 * order of the keys and the layout of everything else stay as the author left them. The result is read again and
 * compared with the file it comes from before anything is written.
 */
@Slf4j
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class PlateauAdder {

    private static final Pattern NUMBERED = Pattern.compile("^(\\d{1,9})_.+");
    private static final Pattern PLAIN = Pattern.compile("[A-Za-z_][A-Za-z0-9_./-]*");
    private static final Set<String> RESERVED = Set.of("true", "false", "yes", "no", "on", "off", "null", "y", "n");

    MapperFactory mapperFactory;

    /**
     * What was added.
     *
     * @param id   the id of the new plateau
     * @param from the folder it was copied from
     * @param path the folder of the new plateau
     */
    public record Added(String id, String from, String path) {}

    /**
     * Copy the folder of the plateau {@code from} and append the new plateau to {@code settings.plateaus}.
     *
     * @param workspaceFile the workspace file, which must be YAML
     * @param id            the id of the new plateau
     * @param from          the id of the plateau to copy
     * @param name          the name of the new plateau, or null for none
     * @param horizon       the horizon of the new plateau, or null for none
     * @param pathOverride  the folder of the new plateau, or null for the folder the naming rule gives
     */
    public Added add(Path workspaceFile, String id, String from, String name, String horizon, String pathOverride) {
        return add(workspaceFile, id, from, name, horizon, pathOverride, null);
    }

    /**
     * Copy the folder of the plateau {@code from} and append the new plateau to {@code settings.plateaus}.
     *
     * @param workspaceFile the workspace file, which must be YAML
     * @param id            the id of the new plateau
     * @param from          the id of the plateau to copy
     * @param name          the name of the new plateau, or null for none
     * @param horizon       the horizon of the new plateau, or null for none
     * @param pathOverride  the folder of the new plateau, or null for the folder the naming rule gives
     * @param baseline      the id of the plateau the new one is compared with, written as its {@code baseline}, or null
     *                      to leave the default (the plateau before it: the new plateau is always appended at the end of
     *                      the list, so that is the last plateau, not necessarily the one it is copied from)
     */
    @SneakyThrows
    public Added add(
        Path workspaceFile,
        String id,
        String from,
        String name,
        String horizon,
        String pathOverride,
        String baseline
    ) {
        val fileName = workspaceFile.getFileName().toString();
        if (!fileName.endsWith(".yaml") && !fileName.endsWith(".yml")) {
            throw new ArchiCodeException(
                "`plateau add` edits a YAML workspace file and %s is not one: add the plateau by hand",
                fileName
            );
        }
        val wksDir = workspaceFile.toAbsolutePath().getParent();
        val text = Files.readString(workspaceFile);
        val mapper = mapperFactory.create(workspaceFile);
        val tree = mapper.readTree(text);
        val structure = Plateaus.checkStructure(tree.path("settings").path("plateaus"));
        if (!structure.isEmpty()) {
            throw new ArchiCodeException("%s", String.join("\n", structure));
        }
        val settings = mapper.readValue(text, Workspace.class).getSettings();
        // every rule on the plateaus that are there already
        Plateaus.select(settings, tree.path("settings").path("manifests").has("paths"), null);
        val plateaus = settings.getPlateaus();
        if (plateaus == null || plateaus.isEmpty()) {
            throw new ArchiCodeException(
                "the workspace declares no `settings.plateaus`: `plateau add` copies a plateau that is there already." +
                    " List the folder of the manifests as the first plateau in `settings.plateaus` (and remove" +
                    " `settings.manifests.paths`) to start"
            );
        }

        val source = plateaus
            .stream()
            .filter(p -> p.getId().equals(from))
            .findFirst()
            .orElseThrow(() ->
                new ArchiCodeException(
                    "unknown plateau `%s` to copy from: the plateaus of this workspace are %s",
                    from,
                    plateaus
                        .stream()
                        .map(p -> "`" + p.getId() + "`")
                        .collect(Collectors.joining(", "))
                )
            );
        if (!Plateaus.isValidId(id)) {
            throw new ArchiCodeException(
                "the plateau id `%s` is not valid: use letters, digits, `.`, `_` and `-`, starting with a letter, a digit or `_`",
                id
            );
        }
        if (plateaus.stream().anyMatch(p -> p.getId().equals(id))) {
            throw new ArchiCodeException("the plateau `%s` exists already", id);
        }
        if (baseline != null && plateaus.stream().noneMatch(p -> p.getId().equals(baseline))) {
            throw new ArchiCodeException(
                "unknown baseline `%s`: the plateaus of this workspace are %s",
                baseline,
                plateaus
                    .stream()
                    .map(p -> "`" + p.getId() + "`")
                    .collect(Collectors.joining(", "))
            );
        }

        val sourcePath = Plateaus.normalize(source.getPath());
        if (sourcePath.isEmpty()) {
            throw new ArchiCodeException(
                "the plateau `%s` is the folder of workspace.yaml itself and cannot be copied: move its manifests into a folder of their own first",
                from
            );
        }
        final String targetPath;
        if (pathOverride != null) {
            val problem = Plateaus.pathProblem(pathOverride);
            if (problem != null) {
                throw new ArchiCodeException(
                    "the path `%s` %s: it must be a folder below the one of workspace.yaml, written relative to it, without `..`",
                    pathOverride,
                    problem
                );
            }
            targetPath = Plateaus.normalize(pathOverride);
        } else {
            targetPath = defaultPath(plateaus, source, id);
        }
        if (targetPath.isEmpty()) {
            throw new ArchiCodeException("the path `%s` is the folder of workspace.yaml itself", pathOverride);
        }
        for (val plateau : plateaus) {
            if (Plateaus.normalize(plateau.getPath()).equals(targetPath)) {
                throw new ArchiCodeException(
                    "the path `%s` is the folder of the plateau `%s` already",
                    targetPath,
                    plateau.getId()
                );
            }
        }
        if (isInside(targetPath, sourcePath) || isInside(sourcePath, targetPath)) {
            throw new ArchiCodeException(
                "the folder `%s` of the new plateau and the folder `%s` of `%s` may not be one inside the other",
                targetPath,
                sourcePath,
                from
            );
        }
        val sourceDir = wksDir.resolve(sourcePath);
        val targetDir = wksDir.resolve(targetPath);
        if (!Files.isDirectory(sourceDir)) {
            throw new ArchiCodeException("the folder `%s` of the plateau `%s` does not exist", sourcePath, from);
        }
        if (Files.exists(targetDir)) {
            throw new ArchiCodeException("`%s` exists already: choose another folder with --path", targetPath);
        }

        // the new text first: when the file cannot be edited, nothing has been copied
        val entry = Settings.Plateau.builder()
            .id(id)
            .name(name)
            .horizon(horizon)
            .path(targetPath)
            .baseline(baseline)
            .build();
        val edited = appendEntry(text, entry);
        verify(mapper.readTree(edited), tree, entry);

        // the folder is created by this call (it fails when another one made it since the test above), so that what is
        // removed on a failure is only what this call wrote: a copy that stops halfway must not make every retry fail
        Files.createDirectories(targetDir.getParent());
        Files.createDirectory(targetDir);
        try {
            copyFolder(sourceDir, targetDir);
            Files.writeString(workspaceFile, edited);
        } catch (IOException | RuntimeException e) {
            deleteFolder(targetDir);
            throw e;
        }
        return new Added(id, sourcePath, targetPath);
    }

    /**
     * The folder of a new plateau that is a copy of {@code source}: next to it, named after the new id. The folders of
     * the author's layout carry a number that sorts them (<code>plateaus/10_as-is</code>, <code>plateaus/20_p1</code>):
     * the new one gets the next multiple of ten above the highest number of the folders that share the parent of the
     * source. The number is cosmetic, the order of the list is the one that counts. A source without a number gives a
     * folder without one.
     */
    static String defaultPath(List<Settings.Plateau> plateaus, Settings.Plateau source, String id) {
        val src = Plateaus.normalize(source.getPath());
        val parent = parentOf(src);
        val last = src.substring(src.lastIndexOf('/') + 1);
        val numbered = NUMBERED.matcher(last);
        if (!numbered.matches()) {
            return join(parent, id);
        }
        long highest = 0;
        for (val plateau : plateaus) {
            val path = Plateaus.normalize(plateau.getPath());
            val m = NUMBERED.matcher(path.substring(path.lastIndexOf('/') + 1));
            if (parentOf(path).equals(parent) && m.matches()) {
                highest = Math.max(highest, Long.parseLong(m.group(1)));
            }
        }
        val width = Math.max(2, numbered.group(1).length());
        return join(parent, String.format("%0" + width + "d_%s", (highest / 10 + 1) * 10, id));
    }

    private static String parentOf(String path) {
        val slash = path.lastIndexOf('/');
        return slash < 0 ? "" : path.substring(0, slash);
    }

    private static String join(String parent, String child) {
        return parent.isEmpty() ? child : parent + "/" + child;
    }

    /** Whether {@code inner} is {@code outer} or below it. */
    private static boolean isInside(String inner, String outer) {
        return inner.equals(outer) || inner.startsWith(outer + "/");
    }

    /**
     * Insert the entry at the end of {@code settings.plateaus} in the text of the file, in the style of the entries
     * that are there (block or flow, the same indentation, quoted when they are).
     */
    static String appendEntry(String text, Settings.Plateau entry) {
        val eol = text.contains("\r\n") ? "\r\n" : "\n";
        val lines = new ArrayList<>(Arrays.asList(text.split("\r?\n", -1)));

        int settings = -1;
        for (int i = 0; i < lines.size(); i++) {
            val line = lines.get(i);
            if (line.matches("^settings\\s*:\\s*(#.*)?$")) {
                settings = i;
                break;
            }
            if (line.matches("^settings\\s*:\\s*[^#\\s].*")) {
                throw new ArchiCodeException(
                    "`settings` is written in the flow style in workspace.yaml and cannot be edited: add the plateau by hand"
                );
            }
        }
        if (settings < 0) {
            throw new ArchiCodeException("`settings` was not found in workspace.yaml: add the plateau by hand");
        }
        int end = lines.size();
        for (int j = settings + 1; j < lines.size(); j++) {
            if (!isBlankOrComment(lines.get(j)) && indentOf(lines.get(j)) == 0) {
                end = j;
                break;
            }
        }
        int keyIndent = -1;
        for (int j = settings + 1; j < end; j++) {
            if (!isBlankOrComment(lines.get(j))) {
                keyIndent = indentOf(lines.get(j));
                break;
            }
        }
        int plateausLine = -1;
        String rest = "";
        if (keyIndent >= 0) {
            val key = Pattern.compile("^ {" + keyIndent + "}plateaus\\s*:(.*)$");
            for (int j = settings + 1; j < end; j++) {
                val m = key.matcher(lines.get(j));
                if (m.matches()) {
                    plateausLine = j;
                    rest = m.group(1).strip();
                    break;
                }
            }
        }
        if (plateausLine < 0) {
            throw new ArchiCodeException(
                "`settings.plateaus` was not found in workspace.yaml: add the plateau by hand"
            );
        }
        var comment = "";
        if (rest.startsWith("#")) {
            comment = rest;
            rest = "";
        } else if (rest.contains(" #")) {
            comment = rest.substring(rest.indexOf(" #") + 1);
            rest = rest.substring(0, rest.indexOf(" #")).strip();
        }
        boolean emptyFlow = false;
        if (rest.equals("[]") || rest.equals("null") || rest.equals("~")) {
            emptyFlow = true;
        } else if (!rest.isEmpty()) {
            throw new ArchiCodeException(
                "`settings.plateaus` is written in the flow style in workspace.yaml and cannot be edited: add the plateau by hand"
            );
        }

        // the items of the list that is there
        int last = plateausLine;
        int dashIndent = -1;
        int lastItemStart = -1;
        for (int j = plateausLine + 1; j < end; j++) {
            val line = lines.get(j);
            if (isBlankOrComment(line)) {
                continue;
            }
            val indent = indentOf(line);
            val dash = isDash(line, indent);
            if (indent > keyIndent || (indent == keyIndent && dash)) {
                last = j;
                if (dash && (dashIndent < 0 || indent == dashIndent)) {
                    dashIndent = indent;
                    lastItemStart = j;
                }
            } else {
                break;
            }
        }
        var flow = false;
        boolean quoteAll = false;
        var offset = 2;
        if (lastItemStart >= 0) {
            val first = lines.get(lastItemStart).substring(dashIndent + 1);
            val content = first.stripLeading();
            offset = 1 + (first.length() - content.length());
            flow = content.startsWith("{");
            for (int j = lastItemStart; j <= last; j++) {
                if (lines.get(j).matches(".*\\bid\\s*:\\s*\".*")) {
                    quoteAll = true;
                }
            }
        } else {
            dashIndent = keyIndent + 2;
        }

        val fields = new ArrayList<String[]>();
        fields.add(new String[] { "id", entry.getId() });
        if (entry.getName() != null) {
            fields.add(new String[] { "name", entry.getName() });
        }
        if (entry.getHorizon() != null) {
            fields.add(new String[] { "horizon", entry.getHorizon() });
        }
        fields.add(new String[] { "path", entry.getPath() });
        if (entry.getBaseline() != null) {
            fields.add(new String[] { "baseline", entry.getBaseline() });
        }
        val quotes = quoteAll;
        val dash = " ".repeat(dashIndent);
        val added = new ArrayList<String>();
        if (flow) {
            added.add(
                dash +
                    "- {" +
                    fields
                        .stream()
                        .map(f -> f[0] + ": " + scalar(f[1], quotes))
                        .collect(Collectors.joining(", ")) +
                    "}"
            );
        } else {
            for (int i = 0; i < fields.size(); i++) {
                val f = fields.get(i);
                added.add(
                    (i == 0 ? dash + "-" + " ".repeat(offset - 1) : " ".repeat(dashIndent + offset)) +
                        f[0] +
                        ": " +
                        scalar(f[1], quoteAll)
                );
            }
        }
        if (emptyFlow) {
            lines.set(plateausLine, " ".repeat(keyIndent) + "plateaus:" + (comment.isEmpty() ? "" : " " + comment));
        }
        lines.addAll(last + 1, added);
        return String.join(eol, lines);
    }

    private static boolean isBlankOrComment(String line) {
        val s = line.strip();
        return s.isEmpty() || s.startsWith("#");
    }

    private static int indentOf(String line) {
        int i = 0;
        while (i < line.length() && line.charAt(i) == ' ') {
            i++;
        }
        return i;
    }

    private static boolean isDash(String line, int indent) {
        return line.startsWith("-", indent) && (line.length() == indent + 1 || line.charAt(indent + 1) == ' ');
    }

    private static String scalar(String value, boolean quote) {
        if (!quote && PLAIN.matcher(value).matches() && !RESERVED.contains(value.toLowerCase())) {
            return value;
        }
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    /**
     * The edited file, read again, is the file it comes from plus the new plateau at the end of the list and nothing
     * else.
     */
    private static void verify(JsonNode edited, JsonNode original, Settings.Plateau entry) {
        val expected = (ObjectNode) original.deepCopy();
        val settings = (ObjectNode) (
            expected.has("settings") ? expected.get("settings") : expected.putObject("settings")
        );
        val list =
            settings.has("plateaus") && settings.get("plateaus").isArray()
                ? (ArrayNode) settings.get("plateaus")
                : settings.putArray("plateaus");
        val node = list.addObject().put("id", entry.getId());
        if (entry.getName() != null) {
            node.put("name", entry.getName());
        }
        if (entry.getHorizon() != null) {
            node.put("horizon", entry.getHorizon());
        }
        node.put("path", entry.getPath());
        if (entry.getBaseline() != null) {
            node.put("baseline", entry.getBaseline());
        }
        if (!expected.equals(edited)) {
            throw new ArchiCodeException(
                "workspace.yaml could not be edited without changing more than the new plateau: nothing was written." +
                    " Add the plateau by hand"
            );
        }
    }

    private static void copyFolder(Path source, Path target) throws IOException {
        Files.walkFileTree(
            source,
            new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    Files.createDirectories(target.resolve(source.relativize(dir).toString()));
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.copy(
                        file,
                        target.resolve(source.relativize(file).toString()),
                        StandardCopyOption.COPY_ATTRIBUTES
                    );
                    return FileVisitResult.CONTINUE;
                }
            }
        );
    }

    @SneakyThrows
    private static void deleteFolder(Path folder) {
        if (!Files.exists(folder)) {
            return;
        }
        Files.walkFileTree(
            folder,
            new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    Files.delete(dir);
                    return FileVisitResult.CONTINUE;
                }
            }
        );
    }
}

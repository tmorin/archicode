package io.morin.archicode.cli;

import io.morin.archicode.ArchiCodeException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import picocli.CommandLine;

/**
 * {@code archicode init [FOLDER]}: writes a small workspace that loads and is drawn (wave 022, run 0160, issue #144, T5). The files
 * are resources of the application ({@code init/}, listed in {@code quarkus.native.resources.includes}). It never overwrites: a
 * folder that already holds {@code .archicode.yaml} is an error and nothing is written. An existing {@code .gitignore} only gets
 * the line it lacks.
 */
@CommandLine.Command(
    name = "init",
    description = {
        "Write a small workspace (.archicode.yaml, a person, a system with a container, a relationship and a view) that loads and is drawn.",
        "FOLDER is created if it does not exist; the default is the current folder. Nothing is overwritten: a folder that already has .archicode.yaml is refused."
    }
)
public class InitCommand implements Runnable {

    /** The workspace file, as a resource {@code init/archicode.yaml} and as the file it is written to. */
    static final String WORKSPACE_FILE = ".archicode.yaml";

    /** The manifests, from the folder of the workspace; the resources are {@code init/<path>}. */
    static final List<String> MANIFESTS = List.of(
        "manifests/customer.yaml",
        "manifests/shop.yaml",
        "manifests/view.shop_overview.yaml"
    );

    /** The line of {@code .gitignore} for the generated views: {@code views}, {@code views-<plateau>}, {@code views-stories}. */
    static final String GITIGNORE_LINE = "/views*/";

    @CommandLine.Parameters(
        index = "0",
        arity = "0..1",
        paramLabel = "<folder>",
        description = "The folder to write the workspace in (default: the current folder)."
    )
    Path folder;

    @Override
    public void run() {
        val root = folder == null ? Path.of("").toAbsolutePath() : folder;
        val workspaceFile = root.resolve(WORKSPACE_FILE);
        if (Files.exists(workspaceFile, LinkOption.NOFOLLOW_LINKS)) {
            throw new ArchiCodeException(
                "the folder `%s` already holds `%s`: init writes nothing over a workspace",
                root,
                WORKSPACE_FILE
            );
        }
        if (Files.exists(root) && !Files.isDirectory(root)) {
            throw new ArchiCodeException("`%s` is not a folder: init writes a workspace in a folder", root);
        }
        for (val manifest : MANIFESTS) {
            if (Files.exists(root.resolve(manifest), LinkOption.NOFOLLOW_LINKS)) {
                throw new ArchiCodeException(
                    "the file `%s` already exists in `%s`: init overwrites nothing",
                    manifest,
                    root
                );
            }
        }
        val written = new ArrayList<String>();
        val created = new ArrayList<Path>();
        try {
            write(workspaceFile, "init/archicode.yaml", WORKSPACE_FILE, written, created);
            for (val manifest : MANIFESTS) {
                write(root.resolve(manifest), "init/" + manifest, manifest, written, created);
            }
        } catch (RuntimeException e) {
            // nothing is left half written: what this run created goes, whatever stopped it
            created.forEach(InitCommand::deleteQuietly);
            throw e;
        }
        written.add(gitignore(root));
        val out = new StringBuilder("Wrote a workspace in ").append(root).append(":\n");
        written.forEach(line -> out.append("  ").append(line).append('\n'));
        val where = folder == null ? "" : "cd " + shellQuoted(folder.toString()) + " && ";
        out.append("Next:\n");
        out.append("  ").append(where).append("archicode query graph       check that it loads\n");
        out.append("  ").append(where).append("archicode views generate    draw it into views/\n");
        out.append("Then run `archicode guide` to learn how to write the rest.\n");
        System.out.print(out);
        System.out.flush();
    }

    @SneakyThrows
    private static void write(Path target, String resource, String name, List<String> written, List<Path> created) {
        Files.createDirectories(target.getParent());
        try (InputStream in = InitCommand.class.getResourceAsStream("/" + resource)) {
            if (in == null) {
                throw new IOException("the resource " + resource + " is not in the application");
            }
            // CREATE_NEW: nothing is overwritten, whatever happened since the check
            Files.write(target, in.readAllBytes(), StandardOpenOption.CREATE_NEW);
            created.add(target);
        }
        written.add(name);
    }

    /** Adds {@link #GITIGNORE_LINE} to {@code .gitignore}, creating the file; removes nothing. Returns what it did. */
    @SneakyThrows
    static String gitignore(Path root) {
        val file = root.resolve(".gitignore");
        if (!Files.exists(file)) {
            Files.writeString(file, GITIGNORE_LINE + "\n", StandardCharsets.UTF_8);
            return ".gitignore (" + GITIGNORE_LINE + ")";
        }
        val text = Files.readString(file, StandardCharsets.UTF_8);
        if (text.lines().anyMatch(line -> GITIGNORE_LINE.equals(line.strip()))) {
            return ".gitignore (already has " + GITIGNORE_LINE + ")";
        }
        val separator = text.isEmpty() || text.endsWith("\n") ? "" : "\n";
        Files.writeString(
            file,
            text + separator + GITIGNORE_LINE + "\n",
            StandardCharsets.UTF_8,
            StandardOpenOption.TRUNCATE_EXISTING
        );
        return ".gitignore (added " + GITIGNORE_LINE + ")";
    }

    private static void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // the error that stopped the run is the one the author reads
        }
    }

    /** The folder as a shell word: plain when it only holds characters a shell leaves alone, else in single quotes. */
    static String shellQuoted(String word) {
        return word.matches("[A-Za-z0-9_./:@%+=,-]+") ? word : "'" + word.replace("'", "'\\''") + "'";
    }
}

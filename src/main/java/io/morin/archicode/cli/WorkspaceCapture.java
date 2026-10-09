package io.morin.archicode.cli;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * An immutable, in-memory content snapshot of a workspace directory, and the only thing a discard ever reads.
 * <p>
 * This class <em>is</em> the Claude bridge's reversibility guarantee (run-0007 TDD {@code DEC-3}, which is the
 * sole owner of the algorithm below). Three properties are load-bearing and deliberate:
 * <ul>
 *   <li>It holds <strong>bytes</strong>, not strings, so "byte-identical restore" is literal for any content and
 *       any line ending.</li>
 *   <li>It has <strong>no reference to {@link LineDiff}</strong> or to any diff type. {@link #restore(Path)} is
 *       computed from the snapshot alone, never from the diff shown to the operator — so a bug in diff
 *       computation can mislead a human but cannot cost them their files (run-0007 PRD {@code NFR-3}).</li>
 *   <li>It is <strong>immutable</strong>, which makes {@link #restore(Path)} idempotent: a retry after a partial
 *       failure converges from whatever state that failure left behind.</li>
 * </ul>
 * The captured set is every regular file under the root, recursively — not merely the configured manifest
 * directories — because everything the invocation is permitted to write must lie inside what a discard restores
 * (PRD {@code NFR-1}). A symbolic link or any other non-regular entry would break that relation, so
 * {@link #capture(Path, int, long)} refuses such a workspace outright rather than treating it as a special case
 * (TDD {@code DEC-15}).
 */
@Slf4j
public final class WorkspaceCapture {

    /**
     * Captured content, keyed by path relative to the capture root. Sorted for deterministic iteration.
     */
    private final TreeMap<Path, byte[]> files;

    /**
     * Directories that existed under the root at capture time, keyed relative to it. Needed because an empty
     * directory has no file to restore it, and because {@link #restore(Path)} must know which directories it is
     * allowed to remove.
     */
    private final TreeSet<Path> directories;

    private final long totalBytes;

    private WorkspaceCapture(TreeMap<Path, byte[]> files, TreeSet<Path> directories, long totalBytes) {
        this.files = files;
        this.directories = directories;
        this.totalBytes = totalBytes;
    }

    /**
     * Snapshot every regular file under {@code root}, recursively.
     * <p>
     * Walks without {@code FOLLOW_LINKS} and classifies every entry with {@link LinkOption#NOFOLLOW_LINKS}. The
     * bounds are checked <em>during</em> the walk and abort it early, so an oversized tree is refused without
     * first being read into memory.
     *
     * @param root      the directory to capture — the workspace file's own directory
     * @param maxFiles  the largest number of regular files this capture will accept
     * @param maxBytes  the largest total content size this capture will accept
     * @return the capture
     * @throws CaptureRefusedException if a symbolic link or other non-regular entry is found, or a bound is
     *                                 exceeded — in both cases nothing has been invoked and nothing is held
     */
    @SneakyThrows
    public static WorkspaceCapture capture(@NonNull Path root, int maxFiles, long maxBytes) {
        val normalizedRoot = root.toAbsolutePath().normalize();

        // Pass 1 — survey. Every refusal happens here, before a single byte of content is read, and it walks
        // the whole tree so the refusal can quote what is actually there rather than only the bound that was
        // exceeded. Metadata-only, so this costs a traversal and no I/O on file contents.
        val survey = survey(normalizedRoot);
        if (survey.getFileCount() > maxFiles) {
            throw new CaptureRefusedException(
                "the workspace directory holds " +
                    survey.getFileCount() +
                    " files, more than the " +
                    maxFiles +
                    " this capability will take custody of. A discard restores everything under the workspace" +
                    " file's directory, so point --workspace at a workspace file in a dedicated directory" +
                    " rather than at a project root."
            );
        }
        if (survey.getTotalBytes() > maxBytes) {
            throw new CaptureRefusedException(
                "the workspace directory holds " +
                    survey.getTotalBytes() +
                    " bytes of content, more than the " +
                    maxBytes +
                    " this capability will take custody of. A discard restores everything under the workspace" +
                    " file's directory, so point --workspace at a workspace file in a dedicated directory" +
                    " rather than at a project root."
            );
        }

        // Pass 2 — read content. Nothing here can refuse, so a capture that starts reading always completes.
        val files = new TreeMap<Path, byte[]>();
        for (Path relative : survey.getFiles()) {
            files.put(relative, Files.readAllBytes(normalizedRoot.resolve(relative)));
        }

        log.debug("captured {} files ({} bytes) under {}", files.size(), survey.getTotalBytes(), normalizedRoot);
        return new WorkspaceCapture(files, survey.getDirectories(), survey.getTotalBytes());
    }

    /**
     * Walk the tree reading only metadata: classify every entry, refuse the ones this class cannot restore
     * faithfully (run-0007 TDD {@code DEC-15}), and total up what is there so a bound refusal can name the real
     * figures (PRD {@code FR-3}: report what was found, not merely that a bound was passed).
     */
    @SneakyThrows
    private static Survey survey(Path normalizedRoot) {
        val files = new TreeSet<Path>();
        val directories = new TreeSet<Path>();
        long total = 0L;

        try (val stream = Files.walk(normalizedRoot)) {
            for (Path path : stream.toList()) {
                if (path.equals(normalizedRoot)) {
                    continue;
                }
                val relative = normalizedRoot.relativize(path);
                val attributes = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);

                if (attributes.isSymbolicLink()) {
                    throw new CaptureRefusedException(
                        "the workspace directory contains a symbolic link, which this capability cannot restore" +
                            " faithfully: " +
                            relative
                    );
                }
                if (attributes.isDirectory()) {
                    directories.add(relative);
                } else if (attributes.isRegularFile()) {
                    files.add(relative);
                    total += attributes.size();
                } else {
                    throw new CaptureRefusedException(
                        "the workspace directory contains an entry that is neither a regular file nor a" +
                            " directory, which this capability cannot restore faithfully: " +
                            relative
                    );
                }
            }
        }
        return new Survey(files, directories, total);
    }

    /**
     * What the metadata-only first pass found.
     */
    @Value
    private static class Survey {

        TreeSet<Path> files;
        TreeSet<Path> directories;
        long totalBytes;

        int getFileCount() {
            return files.size();
        }
    }

    /**
     * @return the number of regular files this capture holds
     */
    public int fileCount() {
        return files.size();
    }

    /**
     * @return the total content size this capture holds, in bytes
     */
    public long totalBytes() {
        return totalBytes;
    }

    /**
     * Classify the current state of {@code root} against this capture.
     * <p>
     * Unchanged files are omitted. Non-regular entries that appeared after the capture are skipped: the
     * invocation's permitted tool set cannot create one, and {@link #capture(Path, int, long)} guarantees none
     * existed beforehand.
     *
     * @param root the same directory this capture was taken from
     * @return every created, modified and deleted file, ordered by path
     */
    @SneakyThrows
    public List<FileChange> diff(@NonNull Path root) {
        val normalizedRoot = root.toAbsolutePath().normalize();
        val changes = new ArrayList<FileChange>();
        val seen = new TreeSet<Path>();

        try (val stream = Files.walk(normalizedRoot)) {
            for (Path path : stream.toList()) {
                if (path.equals(normalizedRoot)) {
                    continue;
                }
                val attributes = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
                if (!attributes.isRegularFile() || attributes.isSymbolicLink()) {
                    continue;
                }
                val relative = normalizedRoot.relativize(path);
                seen.add(relative);
                val current = Files.readAllBytes(path);
                val captured = files.get(relative);
                if (captured == null) {
                    changes.add(new FileChange(relative, ChangeType.CREATED, null, current));
                } else if (!Arrays.equals(captured, current)) {
                    changes.add(new FileChange(relative, ChangeType.MODIFIED, captured, current));
                }
            }
        }

        for (Map.Entry<Path, byte[]> entry : files.entrySet()) {
            if (!seen.contains(entry.getKey())) {
                changes.add(new FileChange(entry.getKey(), ChangeType.DELETED, entry.getValue(), null));
            }
        }

        changes.sort(Comparator.comparing((FileChange change) -> change.getPath().toString()));
        return List.copyOf(changes);
    }

    /**
     * Put {@code root} back exactly as this capture found it.
     * <p>
     * The four steps below are run in this order, which is the order run-0007 TDD {@code DEC-3} specifies:
     * <ol>
     *   <li>create every captured directory that is now missing, shallowest-first;</li>
     *   <li>for every captured file: create its parent if needed; if the path is now a directory, delete that
     *       subtree first; then write the captured bytes <em>only</em> if the file is missing or its current
     *       bytes differ — so a no-op discard does not even bump an mtime;</li>
     *   <li>delete every regular file now under the root that this capture does not hold;</li>
     *   <li>delete every directory now under the root that this capture did not hold, deepest-first.</li>
     * </ol>
     * Every step is attempted even if an earlier path failed, so a partial failure is as complete as it can be;
     * the failures are then reported together. Because this capture is immutable, running {@code restore} again
     * converges from whatever state a failure left behind.
     *
     * @param root the same directory this capture was taken from
     * @return what was changed
     * @throws RestoreFailedException if any path could not be restored, naming each one
     */
    @SneakyThrows
    public RestoreReport restore(@NonNull Path root) {
        val normalizedRoot = root.toAbsolutePath().normalize();
        val failures = new ArrayList<String>();
        var filesRestored = 0;
        var filesDeleted = 0;
        var directoriesRemoved = 0;

        // Step 1 — recreate captured directories, shallowest-first, so a nested one's parent always exists.
        val capturedDirectories = directories
            .stream()
            .sorted(Comparator.<Path>comparingInt(Path::getNameCount))
            .toList();
        for (Path relative : capturedDirectories) {
            val target = normalizedRoot.resolve(relative);
            try {
                if (!Files.isDirectory(target)) {
                    deleteIfRegularFile(target);
                    Files.createDirectories(target);
                }
            } catch (IOException e) {
                failures.add(relative + " (could not recreate directory: " + e + ")");
            }
        }

        // Step 2 — restore captured file content.
        for (Map.Entry<Path, byte[]> entry : files.entrySet()) {
            val relative = entry.getKey();
            val target = normalizedRoot.resolve(relative);
            try {
                if (Files.isDirectory(target, LinkOption.NOFOLLOW_LINKS)) {
                    // The invocation replaced a file with a directory; the directory must go before the write.
                    deleteRecursively(target);
                }
                val parent = target.getParent();
                if (parent != null && !Files.isDirectory(parent)) {
                    Files.createDirectories(parent);
                }
                if (!Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
                    Files.write(target, entry.getValue());
                    filesRestored++;
                } else if (!Arrays.equals(Files.readAllBytes(target), entry.getValue())) {
                    Files.write(target, entry.getValue());
                    filesRestored++;
                }
            } catch (IOException e) {
                failures.add(relative + " (could not restore content: " + e + ")");
            }
        }

        // Step 3 — remove files the invocation created.
        for (Path relative : currentEntries(normalizedRoot, false)) {
            if (files.containsKey(relative)) {
                continue;
            }
            val target = normalizedRoot.resolve(relative);
            try {
                if (Files.deleteIfExists(target)) {
                    filesDeleted++;
                }
            } catch (IOException e) {
                failures.add(relative + " (could not delete created file: " + e + ")");
            }
        }

        // Step 4 — remove directories the invocation created, deepest-first so each is empty when deleted.
        val createdDirectories = currentEntries(normalizedRoot, true)
            .stream()
            .filter(relative -> !directories.contains(relative))
            .sorted(Comparator.<Path>comparingInt(Path::getNameCount).reversed())
            .toList();
        for (Path relative : createdDirectories) {
            val target = normalizedRoot.resolve(relative);
            try {
                if (Files.deleteIfExists(target)) {
                    directoriesRemoved++;
                }
            } catch (IOException e) {
                failures.add(relative + " (could not delete created directory: " + e + ")");
            }
        }

        if (!failures.isEmpty()) {
            throw new RestoreFailedException(List.copyOf(failures));
        }
        return new RestoreReport(filesRestored, filesDeleted, directoriesRemoved);
    }

    /**
     * List the current entries under {@code root}, relative to it, selecting either directories or regular
     * files. Symbolic links and other non-regular entries are never returned: this capture's own contract
     * guarantees none existed at capture time, and deleting one on the operator's behalf is not this class's
     * call to make.
     */
    @SneakyThrows
    private Set<Path> currentEntries(Path root, boolean wantDirectories) {
        val entries = new TreeSet<Path>();
        if (!Files.isDirectory(root)) {
            return entries;
        }
        try (val stream = Files.walk(root)) {
            for (Path path : stream.toList()) {
                if (path.equals(root)) {
                    continue;
                }
                val attributes = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
                if (attributes.isSymbolicLink()) {
                    continue;
                }
                if (wantDirectories ? attributes.isDirectory() : attributes.isRegularFile()) {
                    entries.add(root.relativize(path));
                }
            }
        }
        return entries;
    }

    private static void deleteIfRegularFile(Path target) throws IOException {
        if (Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) {
            Files.delete(target);
        }
    }

    @SneakyThrows
    private static void deleteRecursively(Path target) {
        try (val stream = Files.walk(target)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    /**
     * How one path changed between the capture and the current state.
     */
    public enum ChangeType {
        CREATED,
        MODIFIED,
        DELETED;

        /**
         * @return the lowercase name this type is published under in the HTTP contract (run-0007 TDD
         *         {@code CTR-1})
         */
        public String getId() {
            return name().toLowerCase();
        }
    }

    /**
     * One changed path, carrying both sides' bytes so a caller can render a diff — or not. {@code before} is
     * {@code null} for a created file and {@code after} is {@code null} for a deleted one.
     */
    @Value
    public static class FileChange {

        Path path;
        ChangeType changeType;
        byte[] before;
        byte[] after;
    }

    /**
     * What a {@link WorkspaceCapture#restore(Path)} actually did.
     */
    @Value
    public static class RestoreReport {

        int filesRestored;
        int filesDeleted;
        int directoriesRemoved;
    }

    /**
     * A capture this class declined to take, because taking it would mean promising a restore it could not
     * deliver (run-0007 TDD {@code DEC-5}, {@code DEC-15}). Its message is written for the operator and is
     * returned to them verbatim.
     */
    public static class CaptureRefusedException extends RuntimeException {

        public CaptureRefusedException(String message) {
            super(message);
        }
    }

    /**
     * A restore that could not complete. The session that owns the capture is deliberately kept pending when
     * this is thrown, so the operator can retry — which is safe because the capture is immutable and
     * {@link WorkspaceCapture#restore(Path)} is idempotent.
     */
    public static class RestoreFailedException extends RuntimeException {

        private final List<String> unrestoredPaths;

        public RestoreFailedException(List<String> unrestoredPaths) {
            super("could not restore " + unrestoredPaths.size() + " path(s): " + String.join("; ", unrestoredPaths));
            this.unrestoredPaths = unrestoredPaths;
        }

        public List<String> getUnrestoredPaths() {
            return unrestoredPaths;
        }
    }
}

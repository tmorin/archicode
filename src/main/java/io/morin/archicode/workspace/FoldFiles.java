package io.morin.archicode.workspace;

import io.morin.archicode.ArchiCodeException;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.val;

/**
 * The only writer of a fold (wave 028, run 0208, issue #65): the four operations that change a folder, and the sequence
 * that makes them all or nothing. The service is given a {@code FoldFiles}; the command passes {@link #disk()} and a test
 * passes one that fails at the operation it chooses.
 */
public interface FoldFiles {
    /**
     * Reads a file.
     *
     * @param file the file
     * @return its bytes
     * @throws IOException when the file system refuses
     */
    byte[] read(Path file) throws IOException;

    /**
     * Writes the new bytes next to the target, in a file named {@code <target>.archicode-fold}, with the permissions of the
     * target. A file of that name left by an earlier run is overwritten.
     *
     * @param target the file that will be replaced (the real file, a link resolved)
     * @param bytes  its new content
     * @return the staged file
     * @throws IOException when the file system refuses
     */
    Path stage(Path target, byte[] bytes) throws IOException;

    /**
     * Replaces the target by the staged file, atomically.
     *
     * @param staged the file {@link #stage} wrote
     * @param target the file to replace
     * @throws IOException when the file system refuses
     */
    void move(Path staged, Path target) throws IOException;

    /**
     * Deletes a file, or a staged file (nothing happens when it is not there).
     *
     * @param file the file
     * @throws IOException when the file system refuses
     */
    void delete(Path file) throws IOException;

    /**
     * Puts a file back as it was, from the bytes held in memory.
     *
     * @param file  the file
     * @param bytes what it held
     * @throws IOException when the file system refuses
     */
    void restore(Path file, byte[] bytes) throws IOException;

    /**
     * The implementation that works on the file system.
     *
     * @return the production implementation
     */
    static FoldFiles disk() {
        return new DiskFoldFiles();
    }

    /**
     * Writes the fold: re-reads every file against the bytes the caller read first, stages the new bytes, moves them over
     * their targets, deletes the folded manifest last, and puts everything back when any step fails.
     *
     * @param files   the operations
     * @param folder  the folder of the workspace
     * @param read    the bytes read first, by path relative to the folder, for every file to rewrite or delete
     * @param written the new bytes, by path relative to the folder, in the order they are moved
     * @param deleted the files to delete, relative to the folder
     * @throws io.morin.archicode.ArchiCodeException with sentence 10 or 11 of the design
     */
    static void commit(
        FoldFiles files,
        Path folder,
        Map<String, byte[]> read,
        Map<String, byte[]> written,
        List<String> deleted
    ) {
        requireRead(read, written.keySet());
        requireRead(read, deleted);
        requireUnchanged(files, folder, read);

        // the real file of each rewritten path, then the staged file of each; the files already changed, with the place to
        // put them back; the staged files that were not moved
        val staged = new LinkedHashMap<String, Path>();
        val changed = new LinkedHashMap<String, Path>();
        val targets = new LinkedHashMap<String, Path>();
        var at = "";
        try {
            for (val entry : written.entrySet()) {
                at = entry.getKey();
                val target = folder.resolve(at).toRealPath();
                targets.put(at, target);
                staged.put(at, files.stage(target, entry.getValue()));
            }
            for (val key : List.copyOf(staged.keySet())) {
                at = key;
                files.move(staged.get(key), targets.get(key));
                changed.put(key, targets.get(key));
                staged.remove(key);
            }
            for (val path : deleted) {
                at = path;
                files.delete(folder.resolve(path));
                changed.put(path, folder.resolve(path));
            }
        } catch (IOException e) {
            throw putBack(files, read, staged, changed, at, e);
        }
    }

    private static void requireRead(Map<String, byte[]> read, Collection<String> paths) {
        for (val path : paths) {
            if (!read.containsKey(path)) {
                throw new IllegalArgumentException("no bytes were read for " + path);
            }
        }
    }

    /** Step a of the design: a file that is not what the caller read, or is not there, stops the write before the first byte. */
    private static void requireUnchanged(FoldFiles files, Path folder, Map<String, byte[]> read) {
        for (val entry : read.entrySet()) {
            val now = readOrNothing(files, folder.resolve(entry.getKey()));
            if (now.isEmpty() || !Arrays.equals(now.get(), entry.getValue())) {
                throw new ArchiCodeException(
                    "`%s` changed while the fold was prepared: no file is written, run the command again",
                    entry.getKey()
                );
            }
        }
    }

    /** The bytes of a file, or an empty optional when it cannot be read (it counts as changed). */
    private static Optional<byte[]> readOrNothing(FoldFiles files, Path file) {
        try {
            return Optional.of(files.read(file));
        } catch (IOException ignored) {
            return Optional.empty();
        }
    }

    /** Steps b to d failed at {@code at}: removes the staged files, puts back the files already changed, and says so. */
    private static ArchiCodeException putBack(
        FoldFiles files,
        Map<String, byte[]> read,
        Map<String, Path> staged,
        Map<String, Path> changed,
        String at,
        IOException failure
    ) {
        for (val file : staged.values()) {
            try {
                files.delete(file);
            } catch (IOException ignored) {
                // a staged file that stays is no manifest (its name ends in .archicode-fold), and the files are as they were
            }
        }
        val lost = new ArrayList<String>();
        for (val entry : changed.entrySet()) {
            try {
                files.restore(entry.getValue(), read.get(entry.getKey()));
            } catch (IOException ignored) {
                lost.add("`" + entry.getKey() + "`");
            }
        }
        val reason = Objects.requireNonNullElse(failure.getMessage(), failure.getClass().getSimpleName());
        if (lost.isEmpty()) {
            return new ArchiCodeException("the fold stopped at `%s` (%s): every file is as it was", at, reason);
        }
        return new ArchiCodeException(
            "the fold stopped at `%s` (%s) and could not put back %s: they may be partly written, restore them with git",
            at,
            reason,
            String.join(", ", lost)
        );
    }
}

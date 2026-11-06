package io.morin.archicode.importer;

import io.morin.archicode.ArchiCodeException;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.val;

/**
 * The only writer of an import: it writes {@code (path, bytes)} pairs into a folder that is empty or absent, all or nothing,
 * and serializes nothing. The importer is given an {@code ImportFiles}; the command passes {@link #disk()} and a test passes
 * one that fails at the operation it chooses. {@code FoldFiles} is not extended: its commit rewrites existing files and
 * creates none.
 */
public interface ImportFiles {
    /** The suffix of the staging folder written next to the output. */
    String STAGING_SUFFIX = ".archicode-import";

    /**
     * Tells what is at a path.
     *
     * @param path the path
     * @return {@code ABSENT}, {@code FILE}, {@code EMPTY_FOLDER} or {@code FILLED_FOLDER} (hidden entries count)
     * @throws IOException when the file system refuses
     */
    Kind inspect(Path path) throws IOException;

    /**
     * Creates a folder and its absent parents.
     *
     * @param folder the folder
     * @return the topmost folder that was created, or empty when it was there
     * @throws IOException when the file system refuses
     */
    Optional<Path> createFolder(Path folder) throws IOException;

    /**
     * Writes a file, creating the folders above it.
     *
     * @param file  the file
     * @param bytes its content
     * @throws IOException when the file system refuses
     */
    void write(Path file, byte[] bytes) throws IOException;

    /**
     * Moves the staging folder into place: onto an absent output, or onto an empty folder (atomically when the platform
     * does, else the empty folder is removed and the staging folder moved).
     *
     * @param staging the staging folder
     * @param output  the output
     * @throws IOException when the file system refuses
     */
    void move(Path staging, Path output) throws IOException;

    /**
     * Deletes a file or a folder with all it holds (nothing happens when it is not there).
     *
     * @param path the path
     * @throws IOException when the file system refuses
     */
    void deleteTree(Path path) throws IOException;

    /** What is at a path. */
    enum Kind {
        ABSENT,
        FILE,
        EMPTY_FOLDER,
        FILLED_FOLDER
    }

    /**
     * The implementation that works on the file system.
     *
     * @return the production implementation
     */
    static ImportFiles disk() {
        return new DiskImportFiles();
    }

    /**
     * Writes the files into {@code output}: refuses a filled folder and a file, writes into {@code <output>.archicode-import}
     * (a stale one is replaced), moves it into place, and on any failure removes what it made.
     *
     * @param files   the operations
     * @param output  the folder to create or to fill
     * @param written the content, by path relative to the output
     * @throws ArchiCodeException with one sentence, nothing is written
     */
    static void commit(ImportFiles files, Path output, Map<String, byte[]> written) {
        val staging = output.resolveSibling(output.getFileName() + STAGING_SUFFIX);
        Path createdTop = null;
        var at = output.toString();
        var stagingMade = false;
        try {
            switch (files.inspect(output)) {
                case FILE -> throw new ArchiCodeException("the output %s is a file: import writes a folder", output);
                case FILLED_FOLDER -> throw new ArchiCodeException(
                    "the folder %s is not empty: import writes nothing over a folder",
                    output
                );
                default -> {
                    // absent or empty: accepted
                }
            }
            files.deleteTree(staging);
            createdTop = files.createFolder(staging).orElse(null);
            stagingMade = true;
            for (val entry : written.entrySet()) {
                at = entry.getKey();
                files.write(staging.resolve(entry.getKey()), entry.getValue());
            }
            at = output.toString();
            files.move(staging, output);
        } catch (IOException e) {
            throw putBack(files, staging, createdTop, stagingMade, at, e);
        }
    }

    /** A step failed at {@code at}: removes the staging folder and the folders made above it, and says so. */
    private static ArchiCodeException putBack(
        ImportFiles files,
        Path staging,
        Path createdTop,
        boolean stagingMade,
        String at,
        IOException failure
    ) {
        if (stagingMade) {
            try {
                files.deleteTree(staging);
            } catch (IOException ignored) {
                // a staging folder that stays is no workspace, and the next import replaces it
            }
        }
        removeCreatedParents(files, createdTop, staging);
        val reason = Objects.requireNonNullElse(failure.getMessage(), failure.getClass().getSimpleName());
        return new ArchiCodeException("the import stopped at %s (%s): nothing is written", at, reason);
    }

    /** The folders made above the staging folder go too, so that the file system is as it was. */
    private static void removeCreatedParents(ImportFiles files, Path top, Path staging) {
        if (top == null || top.equals(staging)) {
            return;
        }
        try {
            files.deleteTree(top);
        } catch (IOException ignored) {
            // empty folders that stay hold no file of the import
        }
    }
}

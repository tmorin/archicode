package io.morin.archicode.workspace;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import lombok.val;

/**
 * The operations of a fold on the file system (wave 028, run 0208, DEC-5): the implementation {@link FoldFiles#disk()}
 * hands to the command.
 */
final class DiskFoldFiles implements FoldFiles {

    /** The extension of a staged file: no manifest format reads it, so a file left by a crash is not a manifest. */
    static final String STAGED_SUFFIX = ".archicode-fold";

    @Override
    public byte[] read(Path file) throws IOException {
        return Files.readAllBytes(file);
    }

    @Override
    public Path stage(Path target, byte[] bytes) throws IOException {
        val staged = target.resolveSibling(target.getFileName() + STAGED_SUFFIX);
        // the copy brings the permissions of the target (on any file system) and replaces a file left by an earlier run;
        // the bytes then overwrite the copy, so a target the user made read-only stops the fold here, with its reason
        Files.copy(target, staged, StandardCopyOption.COPY_ATTRIBUTES, StandardCopyOption.REPLACE_EXISTING);
        Files.write(staged, bytes);
        return staged;
    }

    @Override
    public void move(Path staged, Path target) throws IOException {
        Files.move(staged, target, StandardCopyOption.ATOMIC_MOVE);
    }

    @Override
    public void delete(Path file) throws IOException {
        Files.deleteIfExists(file);
    }

    @Override
    public void restore(Path file, byte[] bytes) throws IOException {
        Files.write(file, bytes);
    }
}

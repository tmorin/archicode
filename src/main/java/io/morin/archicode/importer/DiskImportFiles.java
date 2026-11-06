package io.morin.archicode.importer;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.stream.Stream;
import lombok.val;

/** The operations of an import on the file system: the implementation {@link ImportFiles#disk()} hands to the command. */
final class DiskImportFiles implements ImportFiles {

    @Override
    public Kind inspect(Path path) throws IOException {
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
            return Kind.ABSENT;
        }
        if (!Files.isDirectory(path)) {
            return Kind.FILE;
        }
        try (DirectoryStream<Path> entries = Files.newDirectoryStream(path)) {
            return entries.iterator().hasNext() ? Kind.FILLED_FOLDER : Kind.EMPTY_FOLDER;
        }
    }

    @Override
    public Optional<Path> createFolder(Path folder) throws IOException {
        Path top = null;
        for (var p = folder.toAbsolutePath(); p != null && !Files.exists(p); p = p.getParent()) {
            top = p;
        }
        Files.createDirectories(folder);
        return Optional.ofNullable(top);
    }

    @Override
    public void write(Path file, byte[] bytes) throws IOException {
        val parent = file.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.write(file, bytes);
    }

    @Override
    public void move(Path staging, Path output) throws IOException {
        try {
            Files.move(staging, output, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException atomic) {
            if (!Files.isDirectory(output)) {
                throw atomic;
            }
            // the platform does not replace an empty folder atomically: the empty folder goes, then the staging folder moves
            Files.delete(output);
            Files.move(staging, output);
        }
    }

    @Override
    public void deleteTree(Path path) throws IOException {
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
            return;
        }
        if (Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS)) {
            try (Stream<Path> children = Files.list(path)) {
                for (val child : (Iterable<Path>) children::iterator) {
                    deleteTree(child);
                }
            }
        }
        Files.delete(path);
    }
}

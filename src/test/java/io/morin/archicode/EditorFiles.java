package io.morin.archicode;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.experimental.UtilityClass;

/**
 * The files of the editor page as the build writes them, under {@code target/editor-webapp}: the page, the assets beside
 * it and the samples. A read that finds nothing fails with one sentence that names the path and the command that makes it.
 */
@UtilityClass
public class EditorFiles {

    public static final Path FOLDER = Path.of("target/editor-webapp");
    public static final Path PAGE = FOLDER.resolve("standalone.html");
    public static final Path ASSETS = FOLDER.resolve("assets");
    public static final Path SAMPLES = FOLDER.resolve("samples");

    /** The bytes of a file of the built page; a missing file is an error that says how to build it. */
    public static byte[] bytes(Path file) {
        if (!Files.isRegularFile(file)) {
            throw new IllegalStateException(file + " is missing: run `npm run editor:build` to build the editor page");
        }
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new UncheckedIOException(file + " cannot be read: run `npm run editor:build`", e);
        }
    }

    /** The UTF-8 text of a file of the built page. */
    public static String text(Path file) {
        return new String(bytes(file), StandardCharsets.UTF_8);
    }
}

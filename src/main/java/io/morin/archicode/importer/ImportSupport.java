package io.morin.archicode.importer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.val;

/** What the importers share: the workspace file name, reading a JSON file, serializing a manifest, the warning lines. */
public final class ImportSupport {

    /** The workspace file the import writes. */
    public static final String WORKSPACE_FILE = ".archicode.yaml";

    private ImportSupport() {}

    /**
     * Read a JSON file.
     *
     * @param input the file
     * @param file  the name shown in a message
     * @return the tree
     * @throws ArchiCodeException with one sentence
     */
    public static JsonNode parse(Path input, String file) {
        if (Files.isDirectory(input)) {
            throw new ArchiCodeException("%s is a folder: import reads a JSON file", file);
        }
        final byte[] bytes;
        try {
            bytes = Files.readAllBytes(input);
        } catch (IOException e) {
            throw new ArchiCodeException("cannot read %s: %s", file, reason(e));
        }
        try {
            return new ObjectMapper().readTree(bytes);
        } catch (IOException e) {
            throw new ArchiCodeException("%s is not JSON: %s", file, reason(e));
        }
    }

    /**
     * The first line of the message of an exception, or its class name.
     *
     * @param e the exception
     * @return the reason
     */
    public static String reason(IOException e) {
        val message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        val line = message.indexOf('\n');
        return line < 0 ? message : message.substring(0, line);
    }

    /**
     * Serialize a value to the bytes of a file.
     *
     * @param yaml  the writer
     * @param value the value
     * @return UTF-8 bytes
     */
    public static byte[] serialize(ObjectMapper yaml, Object value) {
        try {
            return yaml.writeValueAsString(value).getBytes(StandardCharsets.UTF_8);
        } catch (JsonProcessingException e) {
            throw new ArchiCodeException("the import cannot write the workspace: %s", reason(e));
        }
    }

    /**
     * Add a line to a report when the count is positive.
     *
     * @param lines  the report
     * @param format the line, with one {@code %d}
     * @param count  the count
     */
    public static void add(List<String> lines, String format, int count) {
        if (count > 0) {
            lines.add(String.format(format, count));
        }
    }
}

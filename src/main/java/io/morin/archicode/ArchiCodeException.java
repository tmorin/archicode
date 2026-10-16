package io.morin.archicode;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.val;

/**
 * A failure that the command line explains to its user in a sentence (an input that cannot be used): it is printed on the
 * error output, without a stack trace, and the exit code is 1.
 */
public class ArchiCodeException extends RuntimeException {

    private static final Pattern WRONG_SHAPE = Pattern.compile(
        "^Cannot deserialize value of type `[^`]*` from ([\\w-]+) value"
    );

    /**
     * Create a new {@link ArchiCodeException} with the given message.
     *
     * @param message the message of the exception
     */
    public ArchiCodeException(String message, Object... args) {
        super(String.format(message, args));
    }

    /**
     * The failure for a file that cannot be read as the YAML, TOML or JSON it is meant to be.
     *
     * @param file         the name of the file, as the author knows it, or null when it is not known
     * @param e            what the reader said
     * @param withLocation whether the line and the column of {@code e} are those of the file (they are not when the
     *                     content was read again from a string)
     * @return the failure, whose message is one line: the file, what is wrong and where
     */
    public static ArchiCodeException unreadable(String file, JsonProcessingException e, boolean withLocation) {
        var where = "";
        if (e instanceof JsonMappingException mapping && !mapping.getPath().isEmpty()) {
            where = " at `" + path(mapping) + "`";
        }
        val location = e.getLocation();
        if (withLocation && location != null && location.getLineNr() > 0) {
            where += " (line " + location.getLineNr() + ", column " + location.getColumnNr() + ")";
        }
        return new ArchiCodeException(
            "%s is not valid: %s%s",
            file == null ? "a file" : "`" + file + "`",
            reason(e),
            where
        );
    }

    /** What is wrong, in a sentence an author reads, not the vocabulary of the reader of the file. */
    private static String reason(JsonProcessingException e) {
        if (e instanceof UnrecognizedPropertyException unknown) {
            val known =
                unknown.getKnownPropertyIds() == null
                    ? ""
                    : unknown
                          .getKnownPropertyIds()
                          .stream()
                          .map(String::valueOf)
                          .sorted()
                          .collect(Collectors.joining(", "));
            return (
                "unknown key `" + unknown.getPropertyName() + "`" + (known.isEmpty() ? "" : " (known: " + known + ")")
            );
        }
        val original = e.getOriginalMessage();
        if (original == null) {
            return e.getClass().getSimpleName();
        }
        val firstLine = original.lines().findFirst().orElse(original);
        val shape = WRONG_SHAPE.matcher(firstLine);
        if (shape.find()) {
            val found = shape.group(1).toLowerCase(Locale.ROOT);
            return (
                "the value has the wrong shape (found " +
                ("aeiou".indexOf(found.charAt(0)) >= 0 ? "an " : "a ") +
                found +
                ")"
            );
        }
        return firstLine;
    }

    private static String path(JsonMappingException e) {
        val out = new StringBuilder();
        for (val reference : e.getPath()) {
            if (reference.getFieldName() != null) {
                out.append(out.isEmpty() ? "" : ".").append(reference.getFieldName());
            } else {
                out.append('[').append(reference.getIndex()).append(']');
            }
        }
        return out.toString();
    }
}

package io.morin.archicode;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.InvalidTypeIdException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import io.morin.archicode.manifest.ManifestParser;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.val;

/**
 * A failure that the command line explains to its user in a sentence (an input that cannot be used): it is printed on the
 * error output, without a stack trace, and the exit code is 1.
 */
public class ArchiCodeException extends RuntimeException {

    private static final Pattern KNOWN_KINDS = Pattern.compile("known type ids = \\[([^\\]]*)\\]");

    /**
     * A value that is not of the shape the key takes (a list where there should be a text, a text where there should be a
     * list or an object, a text where there should be a number or a boolean). The reader says it in several ways, all of
     * them with the kind of value it found: {@code from Array value}, {@code from String value ('x')}, {@code from Number
     * value (5)}, {@code from String "x": not a valid ...}.
     */
    private static final Pattern WRONG_SHAPE = Pattern.compile(
        "^Cannot (?:deserialize value of type|construct instance of) .*? from ([A-Za-z-]+)(?: value| \")"
    );

    /** What is said of a group, which is gone (issue #114): what to write instead. The editor says the same words. */
    private static final String GROUP_IS_GONE =
        "a group is no kind any more: write its children in the `elements` of its parent";

    private static final Pattern ACCEPTED_VALUES = Pattern.compile("accepted for Enum class: \\[([^\\]]*)\\]");

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
        // a value that is none of the values of an enum names its key in the sentence, which then needs no place
        val unrecognized = unrecognizedValue(e);
        var where = "";
        if (unrecognized.isEmpty() && e instanceof JsonMappingException mapping && !mapping.getPath().isEmpty()) {
            where = " at `" + path(mapping) + "`";
        }
        val location = e.getLocation();
        if (withLocation && location != null && location.getLineNr() > 0) {
            where += " (line " + location.getLineNr() + ", column " + location.getColumnNr() + ")";
        }
        return new ArchiCodeException(
            "%s is not valid: %s%s",
            file == null ? "a file" : "`" + file + "`",
            unrecognized.orElseGet(() -> reason(e)),
            where
        );
    }

    /** What is wrong, in a sentence an author reads, not the vocabulary of the reader of the file. */
    private static String reason(JsonProcessingException e) {
        if (e instanceof UnrecognizedPropertyException unknown) {
            // the keys an author can write: not the ones the generated builders add for themselves (`$fillValuesFrom`)
            val known =
                unknown.getKnownPropertyIds() == null
                    ? ""
                    : unknown
                          .getKnownPropertyIds()
                          .stream()
                          .map(String::valueOf)
                          .filter(key -> !key.startsWith("$"))
                          .sorted()
                          .collect(Collectors.joining(", "));
            // a key written in camel-case that the manual writes in kebab-case (`hideUnlinked`): the spelling that was removed in 0.17
            val written = unknown.getPropertyName();
            val kebab = written == null ? "" : ManifestParser.documented(written);
            val write =
                !kebab.equals(written) && Arrays.asList(known.split(", ")).contains(kebab)
                    ? ", write `" + kebab + "`"
                    : "";
            return "unknown key `" + written + "`" + write + (known.isEmpty() ? "" : " (known: " + known + ")");
        }
        val original = e.getOriginalMessage();
        if (original == null) {
            return e.getClass().getSimpleName();
        }
        if (e instanceof InvalidTypeIdException unknownKind) {
            // not the class the reader failed to build: the kind written (or its absence), and the kinds that are there
            val known = KNOWN_KINDS.matcher(original);
            val kinds = known.find() ? known.group(1) : subTypeNames(unknownKind);
            return (
                (unknownKind.getTypeId() == null
                    ? "missing `kind`"
                    : "unknown kind `" +
                      unknownKind.getTypeId() +
                      "`" +
                      ("group".equals(unknownKind.getTypeId()) ? ", " + GROUP_IS_GONE : "")) +
                (kinds.isEmpty() ? "" : " (known: " + kinds + ")")
            );
        }
        val firstLine = original.lines().findFirst().orElse(original);
        if (firstLine.startsWith("Cannot coerce empty String")) {
            // an empty text where a list, a map or an object is expected
            return "the value has the wrong shape (found a string)";
        }
        val shape = WRONG_SHAPE.matcher(firstLine);
        if (shape.find()) {
            val found = foundKind(shape.group(1));
            return (
                "the value has the wrong shape (found " +
                ("aeiou".indexOf(found.charAt(0)) >= 0 ? "an " : "a ") +
                found +
                ")"
            );
        }
        return firstLine;
    }

    /**
     * The sentence for a value that is none of the values of an enum ({@code header.kind}, {@code layer}, {@code
     * operator}), or empty: the value written, the values there are (sorted), and the key, since the sentence names it.
     */
    private static Optional<String> unrecognizedValue(JsonProcessingException e) {
        if (!(e instanceof MismatchedInputException mismatched) || mismatched.getOriginalMessage() == null) {
            return Optional.empty();
        }
        val original = mismatched.getOriginalMessage();
        val target = mismatched.getTargetType();
        if (
            target == null ||
            !target.isEnum() ||
            !(e instanceof InvalidFormatException || original.startsWith("Cannot coerce empty String"))
        ) {
            return Optional.empty();
        }
        val accepted = ACCEPTED_VALUES.matcher(original);
        val values = accepted.find()
            ? Arrays.stream(accepted.group(1).split(", ")).sorted().collect(Collectors.joining(", "))
            : Arrays.stream(target.getEnumConstants())
                  .map(constant -> writtenAs(target, constant))
                  .sorted()
                  .collect(Collectors.joining(", "));
        val written = e instanceof InvalidFormatException invalid ? invalid.getValue() : "";
        return Optional.of(
            "unrecognized `" +
                path(mismatched) +
                "` \"" +
                written +
                "\"" +
                (isGroupKind(path(mismatched), String.valueOf(written)) ? ", " + GROUP_IS_GONE : "") +
                (values.isEmpty() ? "" : " (known: " + values + ")")
        );
    }

    /** Whether the value is a group written as the kind of a manifest: {@code group}, or the old {@code container-group}... */
    private static boolean isGroupKind(String path, String written) {
        return (
            path.equals("header.kind") &&
            written
                .trim()
                .toLowerCase(Locale.ROOT)
                .matches("archicode\\.morin\\.io/((container|solution|system)-)?group")
        );
    }

    /** How an author writes a value of an enum: what its {@code @JsonValue} gives, else its name. */
    private static String writtenAs(Class<?> type, Object constant) {
        for (val method : type.getMethods()) {
            if (method.isAnnotationPresent(JsonValue.class) && method.getParameterCount() == 0) {
                try {
                    return String.valueOf(method.invoke(constant));
                } catch (ReflectiveOperationException ignored) {
                    break;
                }
            }
        }
        return String.valueOf(constant);
    }

    /** What the reader calls a kind of value, in the words of the author: a number is a number, whether it has a point or not. */
    private static String foundKind(String reader) {
        val kind = reader.toLowerCase(Locale.ROOT);
        return switch (kind) {
            case "integer", "floating-point", "float", "double", "long", "biginteger", "bigdecimal" -> "number";
            default -> kind;
        };
    }

    /** The names of the kinds a polymorphic type takes, sorted and comma separated, or empty. */
    private static String subTypeNames(InvalidTypeIdException e) {
        val base = e.getBaseType() == null ? null : e.getBaseType().getRawClass();
        val subTypes = base == null ? null : base.getAnnotation(JsonSubTypes.class);
        if (subTypes == null) {
            return "";
        }
        return Arrays.stream(subTypes.value()).map(JsonSubTypes.Type::name).sorted().collect(Collectors.joining(", "));
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

package io.morin.archicode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.core.JsonLocation;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.InvalidTypeIdException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.fasterxml.jackson.databind.type.TypeFactory;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The sentence an author reads when a file cannot be read: what the reader of the file said, in the words of the manual
 * (the file, what is wrong, where). The exceptions are the ones Jackson raises, built by hand where the file that raises
 * them would need a class of its own, and read from a real file where it is simple.
 */
class ArchiCodeExceptionTest {

    enum Spelled {
        FIRST("one"),
        SECOND("two");

        private final String word;

        Spelled(String word) {
            this.word = word;
        }

        @JsonValue
        public String word() {
            return word;
        }
    }

    enum Plain {
        B,
        A
    }

    @JsonSubTypes({
        @JsonSubTypes.Type(value = String.class, name = "text"),
        @JsonSubTypes.Type(value = Integer.class, name = "number")
    })
    interface WithKinds {}

    interface WithoutKinds {}

    @SneakyThrows
    private static com.fasterxml.jackson.core.JsonParser parser() {
        return new com.fasterxml.jackson.core.JsonFactory().createParser("{}");
    }

    private static String sentence(String file, JsonProcessingException e, boolean withLocation) {
        return ArchiCodeException.unreadable(file, e, withLocation).getMessage();
    }

    @Test
    void shouldFormatTheMessageLikeStringFormat() {
        assertEquals(
            "unable to find the view v1",
            new ArchiCodeException("unable to find the view %s", "v1").getMessage()
        );
    }

    @Test
    void shouldSayWhereAYamlSyntaxErrorIs() {
        val mapper = new MapperFactory().create(MapperFormat.YAML);
        try {
            mapper.readTree("a: [b\nc: d\n");
        } catch (JsonProcessingException e) {
            val message = sentence("app.yaml", e, true);
            assertTrue(message.startsWith("`app.yaml` is not valid: "), message);
            assertTrue(message.matches(".* \\(line \\d+, column \\d+\\)"), message);
            // the same error read again from a string has no place in the file
            assertEquals(-1, sentence("app.yaml", e, false).indexOf("(line"));
            // a failure that does not know its file says so
            assertTrue(sentence(null, e, true).startsWith("a file is not valid: "));
            return;
        }
        throw new AssertionError("the YAML should not have been read");
    }

    @Test
    void shouldNameTheKeysOfAMappingFailureByTheirPath() {
        val e = JsonMappingException.from((com.fasterxml.jackson.core.JsonParser) null, "boom");
        // the path is read from the root: the innermost reference is the first one prepended
        e.prependPath(new Object(), 0);
        e.prependPath(new Object(), "settings");
        e.prependPath(new Object(), "paths");
        assertEquals("`f` is not valid: boom at `paths.settings[0]`", sentence("f", e, false));
    }

    @Test
    void shouldSayThePlaceOfALineFromTheFirstOne() {
        val first = new JsonMappingException((java.io.Closeable) null, "boom", new JsonLocation(null, 0, 1, 5));
        assertEquals("`f` is not valid: boom (line 1, column 5)", sentence("f", first, true));
        // a location that is none (line 0, or -1 when it is not known) is no place to tell
        val none = new JsonMappingException((java.io.Closeable) null, "boom", new JsonLocation(null, 0, 0, 5));
        assertEquals("`f` is not valid: boom", sentence("f", none, true));
        val unknown = new JsonMappingException((java.io.Closeable) null, "boom", JsonLocation.NA);
        assertEquals("`f` is not valid: boom", sentence("f", unknown, true));
    }

    @Test
    void shouldGiveTheNameOfTheClassWhenTheReaderSaidNothing() {
        val e = new JsonMappingException((java.io.Closeable) null, null);
        assertEquals("`f` is not valid: JsonMappingException", sentence("f", e, false));
    }

    @Test
    void shouldListTheKeysThatAreKnownWithoutTheOnesTheBuildersAdd() {
        val e = UnrecognizedPropertyException.from(
            parser(),
            Object.class,
            "colour",
            List.of("name", "$fillValuesFrom", "id")
        );
        assertEquals("`f` is not valid: unknown key `colour` (known: id, name) at `colour`", sentence("f", e, false));
    }

    @Test
    void shouldSayWhichSpellingToWriteForACamelCaseKey() {
        val e = UnrecognizedPropertyException.from(
            parser(),
            Object.class,
            "hideUnlinked",
            List.of("hide-unlinked", "name")
        );
        assertEquals(
            "`f` is not valid: unknown key `hideUnlinked`, write `hide-unlinked` (known: hide-unlinked, name) at `hideUnlinked`",
            sentence("f", e, false)
        );
        // a camel-case key that the object does not know in kebab-case gets no advice
        val other = UnrecognizedPropertyException.from(parser(), Object.class, "hideUnlinked", List.of("name"));
        assertEquals(
            "`f` is not valid: unknown key `hideUnlinked` (known: name) at `hideUnlinked`",
            sentence("f", other, false)
        );
    }

    @Test
    void shouldNotListKeysWhenTheReaderDoesNotKnowThem() {
        val e = UnrecognizedPropertyException.from(parser(), Object.class, "colour", null);
        assertEquals("`f` is not valid: unknown key `colour` at `colour`", sentence("f", e, false));
        val none = UnrecognizedPropertyException.from(parser(), Object.class, "colour", List.of("$a"));
        assertEquals("`f` is not valid: unknown key `colour` at `colour`", sentence("f", none, false));
    }

    @Test
    void shouldSayTheKindThatIsNotKnownAndTheOnesThatAre() {
        val type = TypeFactory.defaultInstance().constructType(WithKinds.class);
        val listed = InvalidTypeIdException.from(null, "Could not resolve type id; known type ids = [b, a]", type, "z");
        assertEquals("`f` is not valid: unknown kind `z` (known: b, a)", sentence("f", listed, false));

        // the reader lists none: the kinds are those of the type, sorted
        val annotated = InvalidTypeIdException.from(null, "Could not resolve type id", type, "z");
        assertEquals("`f` is not valid: unknown kind `z` (known: number, text)", sentence("f", annotated, false));

        // a type that takes no kinds lists none
        val bare = TypeFactory.defaultInstance().constructType(WithoutKinds.class);
        val unknown = InvalidTypeIdException.from(null, "Could not resolve type id", bare, "z");
        assertEquals("`f` is not valid: unknown kind `z`", sentence("f", unknown, false));

        // no base type at all
        val noBase = InvalidTypeIdException.from(null, "Could not resolve type id", null, "z");
        assertEquals("`f` is not valid: unknown kind `z`", sentence("f", noBase, false));

        val missing = InvalidTypeIdException.from(null, "Missing type id", type, null);
        assertEquals("`f` is not valid: missing `kind` (known: number, text)", sentence("f", missing, false));
    }

    @Test
    void shouldSayThatAGroupIsNoKind() {
        val type = TypeFactory.defaultInstance().constructType(WithoutKinds.class);
        val group = InvalidTypeIdException.from(null, "Could not resolve type id", type, "group");
        assertEquals(
            "`f` is not valid: unknown kind `group`, a group is no kind any more: write its children in the `elements` of its parent",
            sentence("f", group, false)
        );
    }

    @Test
    void shouldSayWhatShapeTheValueHas() {
        val shapes = new String[][] {
            {
                "Cannot deserialize value of type `java.lang.String` from Array value (token `JsonToken.START_ARRAY`)",
                "an array"
            },
            { "Cannot deserialize value of type `java.util.List` from String value ('x')", "a string" },
            { "Cannot construct instance of `Foo` from Integer value (5)", "a number" },
            { "Cannot deserialize value of type `X` from Floating-point value (5.5)", "a number" },
            { "Cannot deserialize value of type `X` from Object value (token `JsonToken.START_OBJECT`)", "an object" },
            {
                "Cannot deserialize value of type `java.lang.Integer` from String \"x\": not a valid `int` value",
                "a string"
            },
            { "Cannot deserialize value of type `X` from Boolean value (true)", "a boolean" }
        };
        for (val shape : shapes) {
            val e = MismatchedInputException.from(null, String.class, shape[0]);
            assertEquals(
                "`f` is not valid: the value has the wrong shape (found " + shape[1] + ")",
                sentence("f", e, false),
                shape[0]
            );
        }
        val empty = MismatchedInputException.from(
            null,
            List.class,
            "Cannot coerce empty String (\"\") to `java.util.List`\n at [Source]"
        );
        assertEquals("`f` is not valid: the value has the wrong shape (found a string)", sentence("f", empty, false));
    }

    @Test
    void shouldKeepOnlyTheFirstLineOfWhatTheReaderSaidWhenItHasNoShape() {
        val e = MismatchedInputException.from(null, String.class, "Something else\nsecond line");
        assertEquals("`f` is not valid: Something else", sentence("f", e, false));
    }

    @Test
    void shouldListTheValuesAnEnumTakesInTheWordsOfTheAuthor() {
        val e = InvalidFormatException.from(
            null,
            "Cannot deserialize value of type `Spelled` from String \"x\": not one of the values accepted for Enum class: [two, one]",
            "x",
            Spelled.class
        );
        e.prependPath(new Object(), "layer");
        assertEquals("`f` is not valid: unrecognized `layer` \"x\" (known: one, two)", sentence("f", e, true));

        // the reader lists none: the values come from the enum, spelled as the author writes them (@JsonValue, else the name)
        val unlisted = InvalidFormatException.from(null, "Cannot deserialize value", "x", Spelled.class);
        unlisted.prependPath(new Object(), "layer");
        assertEquals("`f` is not valid: unrecognized `layer` \"x\" (known: one, two)", sentence("f", unlisted, false));
        val plain = InvalidFormatException.from(null, "Cannot deserialize value", "x", Plain.class);
        plain.prependPath(new Object(), "operator");
        assertEquals("`f` is not valid: unrecognized `operator` \"x\" (known: A, B)", sentence("f", plain, false));

        // an empty text where a value of the enum is expected
        val empty = MismatchedInputException.from(
            null,
            Plain.class,
            "Cannot coerce empty String (\"\") to `Plain` value"
        );
        empty.prependPath(new Object(), "operator");
        assertEquals("`f` is not valid: unrecognized `operator` \"\" (known: A, B)", sentence("f", empty, false));
    }

    @Test
    void shouldNotTakeAMismatchThatIsNotAnEnumForAnUnrecognizedValue() {
        val e = InvalidFormatException.from(
            null,
            "Cannot deserialize value of type `java.lang.Integer` from String \"x\": not a valid `int` value",
            "x",
            Integer.class
        );
        assertEquals("`f` is not valid: the value has the wrong shape (found a string)", sentence("f", e, false));
        val noTarget = MismatchedInputException.from(null, (Class<?>) null, "Cannot coerce empty String (\"\") to `X`");
        assertEquals(
            "`f` is not valid: the value has the wrong shape (found a string)",
            sentence("f", noTarget, false)
        );
        val noMessage = MismatchedInputException.from(null, String.class, null);
        assertEquals("`f` is not valid: MismatchedInputException", sentence("f", noMessage, false));
    }

    @Test
    void shouldSayThatAGroupIsNoKindWhenItIsTheValueOfAnEnumKind() {
        for (val written : new String[] {
            "archicode.morin.io/group",
            "ArchiCode.Morin.IO/container-group",
            " archicode.morin.io/system-group "
        }) {
            val e = InvalidFormatException.from(null, "Cannot deserialize value", written, Plain.class);
            e.prependPath(new Object(), "kind");
            e.prependPath(new Object(), "header");
            assertTrue(sentence("f", e, false).contains("a group is no kind any more"), written);
        }
        val other = InvalidFormatException.from(
            null,
            "Cannot deserialize value",
            "archicode.morin.io/system",
            Plain.class
        );
        other.prependPath(new Object(), "kind");
        other.prependPath(new Object(), "header");
        assertEquals(-1, sentence("f", other, false).indexOf("a group is no kind"));
        val elsewhere = InvalidFormatException.from(
            null,
            "Cannot deserialize value",
            "archicode.morin.io/group",
            Plain.class
        );
        elsewhere.prependPath(new Object(), "kind");
        assertEquals(-1, sentence("f", elsewhere, false).indexOf("a group is no kind"));
    }
}

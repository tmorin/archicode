package io.morin.archicode.resource.element;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import java.io.IOException;
import java.util.LinkedHashSet;
import lombok.Getter;
import lombok.val;

/**
 * The references an element replaces, with what the author wrote.
 *
 * <p>As a set it is what the model has always had: the references, each once, so that a duplicate and an entry that is
 * not a text are not in it. {@link #getWritten()} is the value as it is in the manifest, which is what the comparison of two
 * plateaus reads: it is the viewpoint kernel that says a reference is listed twice, that an entry is not a reference or
 * that the value is not a list, and it can only if it is given what was written.
 */
public class Replaces extends LinkedHashSet<String> {

    /** The value of the key as written (a list, or whatever the author wrote instead), never null. */
    @Getter
    private final JsonNode written;

    Replaces(JsonNode written) {
        this.written = written;
    }

    /** Reads {@code replaces} and keeps what was written along with the references. */
    public static class Deserializer extends StdDeserializer<Replaces> {

        public Deserializer() {
            super(Replaces.class);
        }

        @Override
        public Replaces deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            val written = (JsonNode) context.readTree(parser);
            val replaces = new Replaces(written);
            if (written.isArray()) {
                written.forEach(entry -> {
                    if (entry.isTextual()) {
                        replaces.add(entry.asText());
                    }
                });
            }
            return replaces;
        }

        @Override
        public Replaces getNullValue(DeserializationContext context) {
            return new Replaces(com.fasterxml.jackson.databind.node.NullNode.getInstance());
        }
    }
}

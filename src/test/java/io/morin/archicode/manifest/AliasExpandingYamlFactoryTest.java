package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotSame;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The YAML factory reads an alias as the node it points at, whatever the input it is given: a string, a reader, a stream,
 * an array of bytes or of characters, and the copies of itself that Jackson makes (a copy of the factory, a mapper
 * read from a stream of bytes of the Java serialization).
 */
class AliasExpandingYamlFactoryTest {

    private static final String YAML = "base: &b\n  size: 3\n  tags: [x, y]\ncopy: *b\n";
    private static final String EXPECTED =
        "{\"base\":{\"size\":3,\"tags\":[\"x\",\"y\"]},\"copy\":{\"size\":3,\"tags\":[\"x\",\"y\"]}}";

    @SneakyThrows
    private static String json(Object node) {
        return new ObjectMapper().writeValueAsString(node);
    }

    @Test
    @SneakyThrows
    void shouldExpandTheAliasFromEveryKindOfInput() {
        val factory = new AliasExpandingYamlFactory();
        val mapper = new ObjectMapper(factory);
        val bytes = YAML.getBytes(StandardCharsets.UTF_8);

        assertEquals(EXPECTED, json(mapper.readTree(YAML)), "a string");
        assertEquals(EXPECTED, json(mapper.readTree(new StringReader(YAML))), "a reader");
        assertEquals(EXPECTED, json(mapper.readTree(new ByteArrayInputStream(bytes))), "a stream");
        assertEquals(EXPECTED, json(mapper.readTree(bytes)), "bytes");
        assertEquals(EXPECTED, json(mapper.readTree(bytes, 0, bytes.length)), "a window of bytes");
        assertEquals(
            EXPECTED,
            json(mapper.readTree(factory.createParser(YAML.toCharArray(), 0, YAML.length()))),
            "characters"
        );
    }

    @Test
    @SneakyThrows
    void shouldKeepExpandingAliasesInACopy() {
        val factory = new AliasExpandingYamlFactory();
        val copy = factory.copy();

        assertNotSame(factory, copy);
        assertInstanceOf(AliasExpandingYamlFactory.class, copy);
        val mapper = new ObjectMapper(copy);
        assertEquals(EXPECTED, json(mapper.readTree(YAML.getBytes(StandardCharsets.UTF_8))));
    }

    @Test
    @SneakyThrows
    void shouldKeepExpandingAliasesOnceSerializedAndRead() {
        val out = new ByteArrayOutputStream();
        try (val stream = new ObjectOutputStream(out)) {
            stream.writeObject(new AliasExpandingYamlFactory());
        }
        try (val stream = new ObjectInputStream(new ByteArrayInputStream(out.toByteArray()))) {
            val read = assertInstanceOf(AliasExpandingYamlFactory.class, stream.readObject());
            val mapper = new ObjectMapper(read);
            assertEquals(EXPECTED, json(mapper.readTree(YAML)));
        }
    }
}

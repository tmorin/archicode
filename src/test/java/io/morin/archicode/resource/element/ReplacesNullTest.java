package io.morin.archicode.resource.element;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/** {@code replaces} keeps what the author wrote: a list, or the {@code null} of a key left empty. */
class ReplacesNullTest {

    private final JsonMapper mapper = JsonMapper.builder()
        .addModule(new SimpleModule().addDeserializer(Replaces.class, new Replaces.Deserializer()))
        .build();

    @Test
    @SneakyThrows
    void shouldKeepAnEmptyValueAsANullThatIsWritten() {
        val replaces = mapper.readValue("null", Replaces.class);
        assertNotNull(replaces, "the key is there, with nothing after it");
        assertTrue(replaces.isEmpty());
        assertTrue(replaces.getWritten().isNull());
    }

    @Test
    @SneakyThrows
    void shouldKeepTheReferencesOfAListOnceEachAndWhatWasWritten() {
        val replaces = mapper.readValue("[\"a.b\", \"a.b\", 5, \"c\"]", Replaces.class);
        assertEquals(Set.of("a.b", "c"), replaces);
        assertEquals("[\"a.b\",\"a.b\",5,\"c\"]", replaces.getWritten().toString());
    }
}

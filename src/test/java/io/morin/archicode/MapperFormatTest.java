package io.morin.archicode;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class MapperFormatTest {

    @Test
    void resolve() {
        Assertions.assertTrue(MapperFormat.resolve(Path.of("foo", "bar.json")).isPresent());
        Assertions.assertTrue(MapperFormat.resolve(Path.of("foo", "bar.yaml")).isPresent());
        Assertions.assertFalse(MapperFormat.resolve(Path.of("foo", "bar.unknown")).isPresent());
    }
}

package io.morin.archicode.workspace;

import io.morin.archicode.MapperFormat;
import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class RawMapperFormatTest {

    @Test
    void resolve() {
        Assertions.assertTrue(MapperFormat.resolve(Path.of("foo", "bar.json")).isPresent());
        Assertions.assertTrue(MapperFormat.resolve(Path.of("foo", "bar.yaml")).isPresent());
        Assertions.assertFalse(MapperFormat.resolve(Path.of("foo", "bar.unknown")).isPresent());
    }
}

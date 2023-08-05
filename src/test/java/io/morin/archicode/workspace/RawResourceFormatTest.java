package io.morin.archicode.workspace;

import io.morin.archicode.manifest.ResourceFormat;
import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class RawResourceFormatTest {

    @Test
    void resolve() {
        Assertions.assertTrue(ResourceFormat.resolve(Path.of("foo", "bar.json")).isPresent());
        Assertions.assertTrue(ResourceFormat.resolve(Path.of("foo", "bar.yaml")).isPresent());
        Assertions.assertFalse(ResourceFormat.resolve(Path.of("foo", "bar.unknown")).isPresent());
    }
}

package io.morin.archicode.workspace;

import io.quarkus.test.junit.QuarkusTest;
import java.nio.file.Path;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@QuarkusTest
class RawWorkspaceFormatTest {

    @Test
    void resolve() {
        Assertions.assertTrue(WorkspaceFormat.resolve(Path.of("foo", "bar.json")).isPresent());
        Assertions.assertTrue(WorkspaceFormat.resolve(Path.of("foo", "bar.yaml")).isPresent());
        Assertions.assertFalse(WorkspaceFormat.resolve(Path.of("foo", "bar.unknown")).isPresent());
    }
}

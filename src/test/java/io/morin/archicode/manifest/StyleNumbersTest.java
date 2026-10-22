package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The properties of a style that are whole numbers ({@code line-style}, {@code line-gap}, {@code line-thickness},
 * {@code round-corner}) are read as the YAML number they are written as: {@code 0x5} is 5, {@code 1_0} is 10, {@code 8.0} and
 * {@code 8.9} are 8 (a number with a dot or an exponent is cut to its whole part), a quoted {@code "8"} is 8. The editor draws the
 * same numbers since wave 019, run 0137 (issue #136, the fourth difference left by #103): the test "a style written as a YAML 1.1 number" of
 * {@code yaml-numbers.test.js} runs the same file.
 */
@QuarkusTest
class StyleNumbersTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    @SneakyThrows
    @Test
    void shouldReadTheWholeNumbersOfAStyleAsTheYamlNumbersTheyAreWrittenAs() {
        Files.writeString(
            dir.resolve("workspace.yaml"),
            """
            settings:
              manifests:
                paths: [manifests]
            styles:
              by-tags:
                hot:
                  line-style: 0x5
                  line-gap: 1_0
                  line-thickness: 1e1
                  round-corner: 8.0
                cut:
                  line-style: 0b11
                  line-gap: 1.5
                  round-corner: 8.9
                quoted:
                  line-style: "7"
                  round-corner: !!int 0x1F
            """
        );
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(
            dir.resolve("manifests/m0.yaml"),
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: s
            """
        );
        val styles = workspaceFactory.create(dir.resolve("workspace.yaml")).getStyles().getByTags();
        val hot = styles.get("hot");
        assertEquals(5, hot.getLineStyle());
        assertEquals(10, hot.getLineGap());
        assertEquals(10, hot.getLineThickness());
        assertEquals(8, hot.getRoundCorner());
        val cut = styles.get("cut");
        assertEquals(3, cut.getLineStyle());
        assertEquals(1, cut.getLineGap());
        assertEquals(8, cut.getRoundCorner());
        val quoted = styles.get("quoted");
        assertEquals(7, quoted.getLineStyle());
        assertEquals(31, quoted.getRoundCorner());
    }
}

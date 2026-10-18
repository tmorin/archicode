package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Application;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * A manifest that uses a YAML anchor, an alias or a tag is read with the value the alias points at, not with its name
 * (tmorin/archicode#74: {@code description: *n} used to give {@code n}). The editor reads the same files the same way:
 * {@code anchors-tags-save.test.js} runs the same texts. Everything here is invented: a mill and a bakery.
 */
@QuarkusTest
class AnchorsAliasesTagsTest {

    @Inject
    ManifestParser manifestParser;

    @TempDir
    Path dir;

    private static final String HEAD = """
    header:
      kind: "archicode.morin.io/system"
      version: "1"
    content:
      id: "bakery"
    """;

    @SneakyThrows
    private Element read(String body) {
        Files.createDirectories(dir.resolve("manifests"));
        Files.writeString(dir.resolve("manifests/bakery.yaml"), HEAD + body);
        val parsed = manifestParser.parse(dir, Set.of("manifests"));
        return parsed.elements().get(Application.class).iterator().next().getElement();
    }

    @Test
    void anAliasIsReadAsTheValueOfItsAnchor() {
        val element = read(
            """
              name: &n "Bakery"   # anchored
              description: *n
            """
        );
        assertEquals("Bakery", element.getName());
        assertEquals("Bakery", element.getDescription());
    }

    @Test
    void anAliasOfAMapAndOfAListIsReadAsTheMapAndTheList() {
        val element = read(
            """
              name: Bakery
              tags: &t
                zone: north
                tier: gold
              qualifiers: &q [oven, flour]
              elements:
                - kind: "container"
                  id: "shop"
                  tags: *t
                  qualifiers: *q
            """
        );
        assertEquals(Map.of("zone", "north", "tier", "gold"), element.getTags());
        assertEquals(List.of("oven", "flour"), List.copyOf(element.getQualifiers()));
        val shop = ((io.morin.archicode.resource.element.application.System) element).getElements().iterator().next();
        assertEquals(Map.of("zone", "north", "tier", "gold"), shop.getTags());
        assertEquals(List.of("oven", "flour"), List.copyOf(shop.getQualifiers()));
    }

    @Test
    void anAliasInsideAnAnchoredNodeIsReadAsWell() {
        val element = read(
            """
              name: &n "Bakery"
              tags: &t
                zone: *n
              elements:
                - kind: "container"
                  id: "shop"
                  tags: *t
            """
        );
        val shop = ((io.morin.archicode.resource.element.application.System) element).getElements().iterator().next();
        assertEquals(Map.of("zone", "Bakery"), shop.getTags());
    }

    @Test
    void aTagIsReadAsTheValueItQualifies() {
        val element = read(
            """
              name: !!str "Bakery"
              description: !!str 12
            """
        );
        assertEquals("Bakery", element.getName());
        assertEquals("12", element.getDescription());
    }

    @Test
    void anAliasWithoutAnAnchorIsToldInOneLineNamingTheFile() {
        val e = assertThrows(ArchiCodeException.class, () ->
            read(
                """
                  name: Bakery
                  description: *n
                """
            )
        );
        assertTrue(e.getMessage().contains("manifests/bakery.yaml"), e.getMessage());
        assertTrue(e.getMessage().contains("found undefined alias `n`"), e.getMessage());
        assertFalse(e.getMessage().contains("\n"), e.getMessage());
        assertFalse(e.getMessage().contains("io.morin"), e.getMessage());
    }
}

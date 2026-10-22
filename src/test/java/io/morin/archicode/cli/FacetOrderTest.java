package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.resource.workspace.Settings.Facets.Facet;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * The facets are iterated in the order of the file (issue #83): the order of their warnings and of the folders of their views is
 * a function of the workspace, not of the identity hash of an enum, which is what a {@code HashSet} of facets was ordered by.
 */
@QuarkusTest
class FacetOrderTest {

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    MapperFactory mapperFactory;

    @TempDir
    Path dir;

    private static String facet(String name) {
        return facet(name, "@.qualifiers[?(@ == '%s')]".formatted(name));
    }

    private static String facet(String name, String filter) {
        return (
            "      - name: \"%s\"\n        actions:\n          - operator: REMOVE\n" +
            "            json-path: \"$.application..relationships[?(%s)]\"\n"
        ).formatted(name, filter);
    }

    /** A workspace with one system and the facets, the ones named in {@code old} in the Jayway dialect, which is refused. */
    @SneakyThrows
    private Path workspace(String folder, List<String> names, List<String> old) {
        val root = Files.createDirectories(dir.resolve(folder));
        val facets = new StringBuilder();
        names.forEach(name ->
            facets.append(old.contains(name) ? facet(name, "@.qualifiers anyof ['%s']".formatted(name)) : facet(name))
        );
        Files.writeString(
            root.resolve(".archicode.yaml"),
            "settings:\n  facets:\n    customs:\n" + facets + "  manifests:\n    paths: [\"manifests\"]\n"
        );
        Files.createDirectories(root.resolve("manifests"));
        Files.writeString(
            root.resolve("manifests/shop.yaml"),
            "header:\n  kind: archicode.morin.io/system\n  version: \"1\"\ncontent:\n  id: shop\n  name: Shop\n"
        );
        return root.resolve(".archicode.yaml");
    }

    private String refusedFacet(Path workspace) {
        val result = CliHarness.run(factory, errorOutput, "-w", workspace.toString(), "views", "generate");
        assertEquals(1, result.exit(), result.err());
        val line = result
            .err()
            .lines()
            .filter(l -> l.startsWith("error: facet "))
            .findFirst()
            .orElseThrow();
        assertTrue(line.contains("no longer read: write `@.qualifiers[?(@ == '"), line);
        return line.split(" ")[2].replace(":", "");
    }

    @Test
    void theFacetsAreAppliedInTheOrderOfTheFileSoTheFirstOneInTheOldDialectIsTheOneRefused() {
        val names = List.of("zulu", "alpha", "mike", "bravo", "x-ray", "delta");
        val old = List.of("bravo", "delta");
        assertEquals("bravo", refusedFacet(workspace("one", names, old)));

        val other = List.of("delta", "x-ray", "bravo", "mike", "alpha", "zulu");
        assertEquals(
            "delta",
            refusedFacet(workspace("other", other, old)),
            "listed in another order, told in that order"
        );
        assertEquals("delta", refusedFacet(workspace("again", other, old)), "and the same when the command runs again");
    }

    @Test
    @SneakyThrows
    void theFacetsAreReadIntoTheOrderOfTheFile() {
        // a hash set of 40 facets does not come out in the order it went in; a linked one does
        val names = new ArrayList<String>();
        for (int i = 0; i < 40; i++) {
            names.add("facet-" + ((i * 7) % 40));
        }
        val yaml = new StringBuilder("facets:\n  customs:\n");
        names.forEach(name -> yaml.append(facet(name).replaceAll("(?m)^  ", "")));
        val settings = mapperFactory.create(MapperFormat.YAML).readValue(yaml.toString(), Settings.class);
        assertEquals(names, settings.getFacets().getCustoms().stream().map(Facet::getName).toList());
    }

    @Test
    @SneakyThrows
    void theActionsOfAFacetAreReadIntoTheOrderOfTheFile() {
        val paths = new ArrayList<String>();
        val yaml = new StringBuilder("facets:\n  customs:\n    - name: \"many\"\n      actions:\n");
        for (int i = 0; i < 30; i++) {
            val path = "$.application..elements[?(@.id == 'e" + ((i * 11) % 30) + "')]";
            paths.add(path);
            yaml.append("        - operator: REMOVE\n          json-path: \"").append(path).append("\"\n");
        }
        val settings = mapperFactory.create(MapperFormat.YAML).readValue(yaml.toString(), Settings.class);
        val facet = settings.getFacets().getCustoms().iterator().next();
        assertEquals(paths, facet.getActions().stream().map(Facet.Action::getJsonPath).toList());
    }
}

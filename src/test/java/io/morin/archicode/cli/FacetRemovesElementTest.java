package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import picocli.CommandLine;

/**
 * A facet that removes an element removes what points at it (wave 010, decision D-1, issue #46), from the command line,
 * on a copy of the invented bookshop of the manual ({@code src/doc/examples/domain_plateaus}) with the facets of the
 * issue added. Before, each of these ended in {@code dangling reference: ...} and no view of the facet was written.
 */
@QuarkusTest
class FacetRemovesElementTest {

    private static final Path EXAMPLE = Path.of("src/doc/examples/domain_plateaus");

    private static final String FACETS = """
      facets:
        customs:
          - name: "by-id"
            actions:
              - operator: REMOVE
                json-path: "$.application..elements[?(@.id == 'catalog')]"
          - name: "changed"
            actions:
              - operator: REMOVE
                json-path: "$.application..elements[?(@.change == 'changed')]"
          - name: "moved"
            actions:
              - operator: REMOVE
                json-path: "$.application..elements[?(@.change == 'moved')]"
          - name: "split"
            actions:
              - operator: REMOVE
                json-path: "$.application..elements[?(@.change == 'split')]"
    """;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    @SneakyThrows
    private Path copy(Path into, boolean withFacets) {
        try (val files = Files.walk(EXAMPLE)) {
            for (val source : files.toList()) {
                val target = into.resolve(EXAMPLE.relativize(source).toString());
                if (Files.isDirectory(source)) {
                    Files.createDirectories(target);
                } else if (!EXAMPLE.relativize(source).startsWith("views-to-be-vs-baseline")) {
                    Files.copy(source, target);
                }
            }
        }
        val workspace = into.resolve("workspace.yaml");
        if (withFacets) {
            Files.writeString(workspace, Files.readString(workspace) + FACETS);
        }
        return workspace;
    }

    private CliHarness.Result generate(Path workspace, String... more) {
        val args = new java.util.ArrayList<>(
            java.util.List.of("--workspace", workspace.toString(), "views", "generate")
        );
        args.addAll(java.util.List.of(more));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    @SneakyThrows
    private static String view(Path workspace, String folder, String name) {
        return Files.readString(
            workspace
                .resolveSibling(folder)
                .resolve("plantuml/application")
                .resolve(name + ".puml")
        );
    }

    private static boolean has(Path workspace, String folder, String name) {
        return Files.exists(
            workspace
                .resolveSibling(folder)
                .resolve("plantuml/application")
                .resolve(name + ".puml")
        );
    }

    @Test
    void anElementRemovedByItsIdTakesTheRelationshipsThatPointedAtItAndTheViewsAreWritten() {
        val workspace = copy(dir.resolve("facets"), true);
        val result = generate(workspace);
        assertEquals(0, result.exit(), result.err());
        // the error output is the one of the workspace without the facets (the example hand-writes a state word, which
        // is told): dropping what pointed at a removed element is what the facet asks for, and adds no warning
        assertEquals(generate(copy(dir.resolve("plain"), false)).err(), result.err());
        assertFalse(result.err().contains("facet") || result.err().contains("dangling"), result.err());
        // the plain views are what they were, with the catalog and the link to it
        assertTrue(view(workspace, "views-to-be", "shop_web-overview").contains("shop.web --> shop.catalog : browses"));
        // through the facet, the web site still pays with the payments and no longer browses anything
        val web = view(workspace, "views-to-be-by-id", "shop_web-overview");
        assertTrue(web.contains("shop.web --> shop.payments : pays with"), web);
        assertFalse(web.contains("catalog"), web);
        assertFalse(has(workspace, "views-to-be-by-id", "shop_catalog-overview"), "the removed element has no view");
        assertFalse(view(workspace, "views-to-be-by-id", "shop-detailed").contains("catalog"));
    }

    @Test
    void theFacetsOfTheComparisonThatRemoveWhatTheyAreAskedToWriteTheirViews() {
        val workspace = copy(dir.resolve("facets"), true);
        val result = generate(workspace, "--against", "baseline");
        assertEquals(0, result.exit(), result.err());
        assertEquals("", result.err(), "a comparison computes the states: nothing to tell");

        // `@.change == 'moved'` removes warehouse.inventory, which warehouse.picking pointed at
        val unfaceted = view(workspace, "views-to-be-vs-baseline", "warehouse_picking-overview");
        assertTrue(unfaceted.contains("warehouse.picking --> warehouse.inventory : counts with"), unfaceted);
        val picking = view(workspace, "views-to-be-vs-baseline-moved", "warehouse_picking-overview");
        assertFalse(picking.contains("inventory") || picking.contains("counts with"), picking);

        // `@.change == 'changed'` removes shop.web, which the customer pointed at
        assertTrue(
            view(workspace, "views-to-be-vs-baseline", "customer-overview").contains("customer --> shop : orders on")
        );
        val customer = view(workspace, "views-to-be-vs-baseline-changed", "customer-overview");
        assertFalse(customer.contains("shop.web") || customer.contains("orders on"), customer);

        // by id, in a comparison too
        assertFalse(view(workspace, "views-to-be-vs-baseline-by-id", "shop_web-overview").contains("catalog"));

        // `@.change == 'split'` removes shop.cart and shop.checkout, which nobody points at: it worked, and still does
        assertFalse(has(workspace, "views-to-be-vs-baseline-split", "shop_cart-overview"));
        assertTrue(has(workspace, "views-to-be-vs-baseline-split", "shop_web-overview"));
    }

    @Test
    @SneakyThrows
    void aWorkspaceWithTheseFacetsGeneratesTheSameUnfacetedViewsAsOneWithout() {
        val with = copy(dir.resolve("with"), true);
        val without = copy(dir.resolve("without"), false);
        assertEquals(0, generate(with, "--against", "baseline").exit());
        assertEquals(0, generate(without, "--against", "baseline").exit());
        for (val folder : new String[] { "views-to-be", "views-to-be-vs-baseline" }) {
            try (val files = Files.walk(without.resolveSibling(folder))) {
                for (val file : files.filter(Files::isRegularFile).toList()) {
                    val other = with
                        .resolveSibling(folder)
                        .resolve(without.resolveSibling(folder).relativize(file).toString());
                    assertEquals(Files.readString(file), Files.readString(other), file.toString());
                }
            }
        }
    }
}

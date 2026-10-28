package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.viewpoint.kernel.RelationshipLabel;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import picocli.CommandLine;

/**
 * The {@code links} property of a saved Map view (wave 026, run 0197, issue #143; decisions DEC-1 to DEC-6 and DEC-8 of the
 * TDD): the boxes and links that are drawn, the sentences and the exit code of a mistake, the plateau warning and skip of
 * {@code ViewInPlateau}, and a comparison. The kernel's own contract is tested in Rust over the same case table
 * ({@code map-links-cases.json}); here the table is read for the existence test only. The workspaces are written in a temporary
 * folder: no shipped file carries {@code links} (DEC-9).
 */
@QuarkusTest
class MapLinksTest {

    private static final Path CASES = Path.of("src/test/javascript/viewpoint-kernel/map-links-cases.json");

    private static final String SETTINGS = """
    settings:
      name: "Links"
      manifests:
        paths: ["manifests/**"]
    """;

    private static final String SHOP = """
    header:
      kind: "archicode.morin.io/system"
      version: "1"
    content:
      id: "shop"
      name: "Shop"
      elements:
        - kind: "container"
          id: "web"
          name: "Web site"
          relationships:
            - destination: "shop.api"
              label: "calls"
            - destination: "shop.api"
        - kind: "container"
          id: "api"
          name: "Api"
          relationships:
            - destination: "shop.billing"
              label: "bills"
        - kind: "container"
          id: "billing"
          name: "Billing"
    """;

    private static final String CUSTOMER = """
    header:
      kind: "archicode.morin.io/person"
      version: "1"
    content:
      id: "customer"
      name: "Customer"
      relationships:
        - destination: "shop.web"
          label: "uses"
    """;

    private static final String BASELINE = """
    header:
      kind: "archicode.morin.io/plateau"
      version: "1"
    content:
      id: "baseline"
      name: "As is"
    """;

    /** The plateau that removes the billing (and with it the relationship towards it) and brings a partner. */
    private static final String TO_BE = """
    header:
      kind: "archicode.morin.io/plateau"
      version: "1"
    content:
      id: "to-be"
      name: "To be"
      override: "baseline"
      patches:
        - operator: REMOVE
          target: "shop.billing"
    """;

    private static final String PARTNER = """
    header:
      kind: "archicode.morin.io/person"
      version: "1"
      plateau: "to-be"
    content:
      id: "partner"
      name: "Partner"
      relationships:
        - destination: "shop.web"
          label: "pushes"
    """;

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @TempDir
    Path dir;

    /** A workspace with no plateau: the shop, a customer and the view {@code view_id} (the text of its manifest). */
    @SneakyThrows
    static Path plain(Path into, String view) {
        val workspace = into.resolve(".archicode.yaml");
        Files.createDirectories(into.resolve("manifests"));
        Files.writeString(workspace, SETTINGS);
        Files.writeString(into.resolve("manifests/shop.yaml"), SHOP);
        Files.writeString(into.resolve("manifests/customer.yaml"), CUSTOMER);
        if (view != null) {
            Files.writeString(into.resolve("manifests/view.yaml"), view);
        }
        return workspace;
    }

    /**
     * The same workspace with two plateaus: {@code baseline} and {@code to-be}, which removes the billing and has a partner
     * that pushes to the web site.
     */
    @SneakyThrows
    static Path layered(Path into, String... manifests) {
        val workspace = plain(into, null);
        Files.writeString(into.resolve("manifests/plateau.baseline.yaml"), BASELINE);
        Files.writeString(into.resolve("manifests/plateau.to-be.yaml"), TO_BE);
        Files.writeString(into.resolve("manifests/partner.yaml"), PARTNER);
        for (var i = 0; i < manifests.length; i++) {
            Files.writeString(into.resolve("manifests/extra" + i + ".yaml"), manifests[i]);
        }
        return workspace;
    }

    /** A saved view of the Map of the application layer with these properties (YAML lines, indented by 4 spaces). */
    static String mapView(String id, String properties) {
        return """
        header:
          kind: "archicode.morin.io/view"
          version: "1"
        content:
          id: "%s"
          viewpoint: "map"
          layer: "application"
          properties:
        %s
        """.formatted(id, properties.indent(4).stripTrailing());
    }

    private CliHarness.Result generate(Path workspace, String... more) {
        val args = new ArrayList<>(List.of("--workspace", workspace.toString(), "views", "generate"));
        args.addAll(List.of(more));
        return CliHarness.run(factory, errorOutput, args.toArray(String[]::new));
    }

    @SneakyThrows
    private static String drawn(Path folder, String viewId) {
        try (val files = Files.walk(folder)) {
            return Files.readString(
                files
                    .filter(p ->
                        p
                            .getFileName()
                            .toString()
                            .equals(viewId + ".puml")
                    )
                    .findFirst()
                    .orElseThrow()
            );
        }
    }

    @Test
    void shouldDrawOnlyTheEndsOfTheLinksAndTheLinks() {
        val workspace = plain(
            dir,
            mapView(
                "links_view",
                """
                opened: ["shop"]
                links:
                  - {source: "shop.web", destination: "shop.api", label: "calls"}
                """
            )
        );
        val result = generate(workspace, "-i", "links_view");
        assertEquals(0, result.exit(), result.err());
        val puml = drawn(dir.resolve("views"), "links_view");
        assertTrue(puml.contains("Web site"), puml);
        assertTrue(puml.contains("Api"), puml);
        assertTrue(puml.contains("calls"), puml);
        assertFalse(puml.contains("Billing"), puml);
        assertFalse(puml.contains("Customer"), puml);
        assertFalse(puml.contains("bills"), puml);
    }

    @Test
    void shouldMatchTheLabelAfterTrimmingAndNoLabelAsNoLabel() {
        val trimmed = plain(
            dir.resolve("trimmed"),
            mapView(
                "links_view",
                """
                opened: ["shop"]
                links:
                  - {source: "shop.web", destination: "shop.api", label: "  calls "}
                """
            )
        );
        assertEquals(0, generate(trimmed, "-i", "links_view").exit());
        assertTrue(drawn(dir.resolve("trimmed/views"), "links_view").contains("calls"));
        // the second relationship of the web site towards the api has no label and is not the first one
        val bare = plain(
            dir.resolve("bare"),
            mapView(
                "links_view",
                """
                opened: ["shop"]
                links:
                  - {source: "shop.web", destination: "shop.api"}
                """
            )
        );
        val result = generate(bare, "-i", "links_view");
        assertEquals(0, result.exit(), result.err());
        assertFalse(drawn(dir.resolve("bare/views"), "links_view").contains("calls"));
    }

    @Test
    void shouldDrawTheSameFileForAnEmptyListAsForNoKey() {
        val without = plain(dir.resolve("without"), mapView("v", "opened: [\"shop\"]"));
        val empty = plain(dir.resolve("empty"), mapView("v", "opened: [\"shop\"]\nlinks: []"));
        assertEquals(0, generate(without, "-i", "v").exit());
        assertEquals(0, generate(empty, "-i", "v").exit());
        val expected = drawn(dir.resolve("without/views"), "v");
        assertEquals(expected, drawn(dir.resolve("empty/views"), "v"));
        assertTrue(expected.contains("Billing"), expected);
    }

    @Test
    @SneakyThrows
    void shouldSayTheShapeOfAnEntryAsOneErrorLine() {
        val workspace = plain(
            dir,
            mapView("links_view", "links:\n  - {source: \"shop.web\", destination: \"shop.api\", lable: \"calls\"}")
        );
        val result = generate(workspace, "-i", "links_view");
        assertEquals(1, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .startsWith(
                    "error: the view links_view: `links[0]` is a mapping with `source`, `destination` and optionally `label`, and "
                ),
            result.err()
        );
        assertTrue(result.err().endsWith(" is not one\n"), result.err());
        assertEquals(1, result.err().split("\n").length, result.err());
        assertFalse(Files.exists(dir.resolve("views")));
    }

    @Test
    void shouldSayAnEntryThatNamesNoRelationshipAsOneErrorLine() {
        val workspace = plain(
            dir,
            mapView(
                "links_view",
                """
                links:
                  - {source: "shop.web", destination: "shop.api", label: "calls"}
                  - {source: "shop.web", destination: "shop.api", label: "reads"}
                """
            )
        );
        val result = generate(workspace, "-i", "links_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view links_view: `links[1]` names a relationship from `shop.web` to `shop.api` with the label `reads`, which does not exist\n",
            result.err()
        );
        assertFalse(Files.exists(dir.resolve("views")));
    }

    @Test
    void shouldSayAnEntryWithNoLabelThatNamesNoRelationshipWithoutALabel() {
        val workspace = plain(
            dir,
            mapView("links_view", "links:\n  - {source: \"customer\", destination: \"shop.web\"}")
        );
        val result = generate(workspace, "-i", "links_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view links_view: `links[0]` names a relationship from `customer` to `shop.web` with no label, which does not exist\n",
            result.err()
        );
    }

    @Test
    void shouldSayAnUnknownEndLikeAPinnedElementThatIsNotThere() {
        val workspace = plain(
            dir,
            mapView("links_view", "links:\n  - {source: \"shop.web\", destination: \"nowhere\", label: \"calls\"}")
        );
        val result = generate(workspace, "-i", "links_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals("error: the view links_view: dangling reference: nowhere\n", result.err());
    }

    @Test
    void shouldRefuseLinksInTheMapOfTheTechnologyLayer() {
        val workspace = plain(
            dir,
            mapView(
                "links_view",
                "links:\n  - {source: \"shop.web\", destination: \"shop.api\", label: \"calls\"}"
            ).replace("layer: \"application\"", "layer: \"technology\"")
        );
        val result = generate(workspace, "-i", "links_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view links_view: links is read in the map of the application layer only\n",
            result.err()
        );
    }

    @Test
    void shouldWarnOfALinkThePlateauLacksAndDrawTheRest() {
        val workspace = layered(
            dir,
            mapView(
                "links_view",
                """
                opened: ["shop"]
                links:
                  - {source: "shop.web", destination: "shop.api", label: "calls"}
                  - {source: "partner", destination: "shop.web", label: "pushes"}
                """
            )
        );
        val result = generate(workspace, "--plateau", "baseline", "-i", "links_view");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .contains(
                    "warning: the view `links_view` is drawn without the link `partner -> shop.web`, which the plateau `baseline` does not have\n"
                ),
            result.err()
        );
        val puml = drawn(dir.resolve("views-baseline"), "links_view");
        assertTrue(puml.contains("Web site"), puml);
        assertFalse(puml.contains("Partner"), puml);
    }

    @Test
    void shouldSkipAViewNoneOfWhoseLinksIsInThePlateau() {
        val workspace = layered(
            dir,
            mapView("links_view", "links:\n  - {source: \"partner\", destination: \"shop.web\", label: \"pushes\"}")
        );
        val result = generate(workspace, "--plateau", "baseline", "-i", "links_view");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result.err().contains("warning: skip `links_view`: none of its links is in the plateau `baseline`\n"),
            result.err()
        );
        assertFalse(Files.exists(dir.resolve("views-baseline/plantuml")));
        // the plateau that has the relationship draws the view
        val to = generate(workspace, "--plateau", "to-be", "-i", "links_view");
        assertEquals(0, to.exit(), to.err());
        assertTrue(drawn(dir.resolve("views-to-be"), "links_view").contains("Partner"));
    }

    @Test
    void shouldDrawARemovedRelationshipThatALinkNamesAsRemovedInAComparison() {
        val workspace = layered(
            dir,
            mapView(
                "links_view",
                """
                opened: ["shop"]
                links:
                  - {source: "shop.api", destination: "shop.billing", label: "bills"}
                """
            )
        );
        val result = generate(workspace, "--plateau", "to-be", "--against", "baseline", "-i", "links_view");
        assertEquals(0, result.exit(), result.err());
        val puml = drawn(dir.resolve("views-to-be-vs-baseline"), "links_view");
        assertTrue(puml.contains("bills"), puml);
        assertTrue(puml.contains("removed"), puml);
        assertFalse(puml.contains("Customer"), puml);
    }

    /** The saved Map of the highlight tests: the shop opened, so that its three relationships are drawn. */
    private static final String OPENED = "opened: [\"shop\"]\n";

    private static final String HEAVY = "-[thickness=5,#D55E00]->";
    private static final String CALM = "-[#A6A6A6]->";

    private static long arrows(String puml) {
        return puml
            .lines()
            .filter(line -> line.contains("->"))
            .count();
    }

    @Test
    void shouldDrawTheHighlightedLinkHeavyAndTheOthersCalm() {
        val workspace = plain(
            dir,
            mapView(
                "hl_view",
                OPENED +
                    """
                    highlight:
                      - {source: "shop.web", destination: "shop.api", label: "calls"}
                    """
            )
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(0, result.exit(), result.err());
        val puml = drawn(dir.resolve("views"), "hl_view");
        assertTrue(puml.contains(HEAVY), puml);
        assertTrue(puml.contains("**<U+25B6>** **calls**"), puml);
        assertTrue(puml.contains(CALM), puml);
        assertTrue(puml.contains("<color:#7F7F7F>bills</color>"), puml);
        assertFalse(puml.contains("**<U+25B6>** **bills**"), puml);
        // the highlight adds no box and no link
        val plainView = plain(dir.resolve("plain"), mapView("hl_view", OPENED));
        assertEquals(0, generate(plainView, "-i", "hl_view").exit());
        val without = drawn(dir.resolve("plain/views"), "hl_view");
        assertEquals(arrows(without), arrows(puml));
        assertFalse(without.contains("D55E00") || without.contains("A6A6A6"), without);
    }

    @Test
    void shouldDrawTheSameFileForAnEmptyHighlightAsForNoKey() {
        val without = plain(dir.resolve("without"), mapView("v", OPENED));
        val empty = plain(dir.resolve("empty"), mapView("v", OPENED + "highlight: []"));
        val nothing = plain(dir.resolve("nothing"), mapView("v", OPENED + "highlight:"));
        assertEquals(0, generate(without, "-i", "v").exit());
        assertEquals(0, generate(empty, "-i", "v").exit());
        assertEquals(0, generate(nothing, "-i", "v").exit());
        val expected = drawn(dir.resolve("without/views"), "v");
        assertEquals(expected, drawn(dir.resolve("empty/views"), "v"));
        assertEquals(expected, drawn(dir.resolve("nothing/views"), "v"));
        assertFalse(expected.contains("D55E00") || expected.contains("A6A6A6"), expected);
    }

    @Test
    void shouldDrawAViewWhoseHighlightNamesALinkThatIsNotDrawnAsWithoutHighlight() {
        // the customer is not on the map: the relationship exists, is not drawn, and marks nothing (DEC-4)
        val hidden = plain(
            dir.resolve("hidden"),
            mapView(
                "v",
                OPENED +
                    """
                    hidden: ["customer"]
                    highlight:
                      - {source: "customer", destination: "shop.web", label: "uses"}
                    """
            )
        );
        val without = plain(dir.resolve("without"), mapView("v", OPENED + "hidden: [\"customer\"]"));
        val result = generate(hidden, "-i", "v");
        assertEquals(0, result.exit(), result.err());
        assertEquals(0, generate(without, "-i", "v").exit());
        assertEquals(drawn(dir.resolve("without/views"), "v"), drawn(dir.resolve("hidden/views"), "v"));
    }

    @Test
    void shouldReadHighlightNextToLinksAndMarkInsideTheChosenLinks() {
        val workspace = plain(
            dir,
            mapView(
                "hl_view",
                OPENED +
                    """
                    links:
                      - {source: "shop.web", destination: "shop.api", label: "calls"}
                      - {source: "shop.api", destination: "shop.billing", label: "bills"}
                    highlight:
                      - {source: "shop.api", destination: "shop.billing", label: "bills"}
                    """
            )
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(0, result.exit(), result.err());
        val puml = drawn(dir.resolve("views"), "hl_view");
        assertTrue(puml.contains("**<U+25B6>** **bills**"), puml);
        assertTrue(puml.contains("<color:#7F7F7F>calls</color>"), puml);
        assertFalse(puml.contains("Customer"), puml);
    }

    @Test
    @SneakyThrows
    void shouldSayTheShapeOfAHighlightEntryAsOneErrorLine() {
        val workspace = plain(
            dir,
            mapView("hl_view", "highlight:\n  - {source: \"shop.web\", destination: \"shop.api\", lable: \"calls\"}")
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(1, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .startsWith(
                    "error: the view hl_view: `highlight[0]` is a mapping with `source`, `destination` and optionally `label`, and "
                ),
            result.err()
        );
        assertTrue(result.err().endsWith(" is not one\n"), result.err());
        assertEquals(1, result.err().split("\n").length, result.err());
        assertFalse(Files.exists(dir.resolve("views")));
    }

    @Test
    void shouldSayAHighlightThatNamesNoRelationshipAsOneErrorLine() {
        val workspace = plain(
            dir,
            mapView(
                "hl_view",
                """
                highlight:
                  - {source: "shop.web", destination: "shop.api", label: "calls"}
                  - {source: "shop.web", destination: "shop.api", label: "reads"}
                """
            )
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view hl_view: `highlight[1]` names a relationship from `shop.web` to `shop.api` with the label `reads`, which does not exist\n",
            result.err()
        );
        assertFalse(Files.exists(dir.resolve("views")));
    }

    @Test
    void shouldSayAHighlightWithNoLabelThatNamesNoRelationshipWithoutALabel() {
        val workspace = plain(
            dir,
            mapView("hl_view", "highlight:\n  - {source: \"customer\", destination: \"shop.web\"}")
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view hl_view: `highlight[0]` names a relationship from `customer` to `shop.web` with no label, which does not exist\n",
            result.err()
        );
    }

    @Test
    void shouldSayAnUnknownEndOfHighlightLikeAPinnedElementThatIsNotThere() {
        val workspace = plain(
            dir,
            mapView("hl_view", "highlight:\n  - {source: \"shop.web\", destination: \"nowhere\", label: \"calls\"}")
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals("error: the view hl_view: dangling reference: nowhere\n", result.err());
    }

    @Test
    void shouldRefuseHighlightInTheMapOfTheTechnologyLayer() {
        val workspace = plain(
            dir,
            mapView(
                "hl_view",
                "highlight:\n  - {source: \"shop.web\", destination: \"shop.api\", label: \"calls\"}"
            ).replace("layer: \"application\"", "layer: \"technology\"")
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(1, result.exit(), result.err());
        assertEquals(
            "error: the view hl_view: highlight is read in the map of the application layer only\n",
            result.err()
        );
    }

    @Test
    void shouldCheckTheLinksBeforeTheHighlight() {
        val workspace = plain(
            dir,
            mapView(
                "hl_view",
                """
                links:
                  - {source: "shop.web", destination: "shop.api", label: "reads"}
                highlight:
                  - {source: "shop.web", destination: "shop.api", label: "also"}
                """
            )
        );
        val result = generate(workspace, "-i", "hl_view");
        assertEquals(1, result.exit(), result.err());
        assertTrue(result.err().contains("`links[0]` names a relationship"), result.err());
        assertFalse(result.err().contains("highlight"), result.err());
    }

    @Test
    void shouldIgnoreHighlightInAViewpointThatIsNotAMap() {
        val withHighlight = plain(
            dir.resolve("with"),
            mapView("v", "element: \"shop\"\nhighlight:\n  - {source: \"nope\", destination: \"x\"}").replace(
                "viewpoint: \"map\"",
                "viewpoint: \"overview\""
            )
        );
        val without = plain(
            dir.resolve("without"),
            mapView("v", "element: \"shop\"").replace("viewpoint: \"map\"", "viewpoint: \"overview\"")
        );
        val result = generate(withHighlight, "-i", "v");
        assertEquals(0, result.exit(), result.err());
        assertEquals(0, generate(without, "-i", "v").exit());
        assertEquals(drawn(dir.resolve("without/views"), "v"), drawn(dir.resolve("with/views"), "v"));
        assertEquals("", result.err());
    }

    @Test
    void shouldWarnOfAHighlightThePlateauLacksAndDrawTheViewWithoutIt() {
        val workspace = layered(
            dir,
            mapView(
                "hl_view",
                OPENED +
                    """
                    highlight:
                      - {source: "shop.web", destination: "shop.api", label: "calls"}
                      - {source: "partner", destination: "shop.web", label: "pushes"}
                    """
            )
        );
        val result = generate(workspace, "--plateau", "baseline", "-i", "hl_view");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .contains(
                    "warning: the view `hl_view` is drawn without the highlight `partner -> shop.web`, which the plateau `baseline` does not have\n"
                ),
            result.err()
        );
        val puml = drawn(dir.resolve("views-baseline"), "hl_view");
        assertTrue(puml.contains("**<U+25B6>** **calls**"), puml);
        assertFalse(puml.contains("Partner"), puml);
        // the plateau that has the relationship marks both
        val to = generate(workspace, "--plateau", "to-be", "-i", "hl_view");
        assertEquals(0, to.exit(), to.err());
        assertFalse(to.err().contains("highlight"), to.err());
        assertTrue(drawn(dir.resolve("views-to-be"), "hl_view").contains("**<U+25B6>** **pushes**"));
    }

    @Test
    void shouldDrawAViewWhoseHighlightIsAllLackingInThePlateauAndNotSkipIt() {
        val workspace = layered(
            dir,
            mapView(
                "hl_view",
                OPENED + "highlight:\n  - {source: \"partner\", destination: \"shop.web\", label: \"pushes\"}"
            )
        );
        val result = generate(workspace, "--plateau", "baseline", "-i", "hl_view");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result
                .err()
                .contains(
                    "warning: the view `hl_view` is drawn without the highlight `partner -> shop.web`, which the plateau `baseline` does not have\n"
                ),
            result.err()
        );
        assertFalse(result.err().contains("skip"), result.err());
        val puml = drawn(dir.resolve("views-baseline"), "hl_view");
        assertFalse(puml.contains("D55E00") || puml.contains("A6A6A6"), puml);
    }

    @Test
    void shouldStillSkipAViewWhoseLinksAreAllLackingWhateverItsHighlight() {
        val workspace = layered(
            dir,
            mapView(
                "hl_view",
                """
                links:
                  - {source: "partner", destination: "shop.web", label: "pushes"}
                highlight:
                  - {source: "partner", destination: "shop.web", label: "pushes"}
                """
            )
        );
        val result = generate(workspace, "--plateau", "baseline", "-i", "hl_view");
        assertEquals(0, result.exit(), result.err());
        assertTrue(
            result.err().contains("warning: skip `hl_view`: none of its links is in the plateau `baseline`\n"),
            result.err()
        );
        assertFalse(Files.exists(dir.resolve("views-baseline/plantuml")));
    }

    @Test
    void shouldHighlightARemovedRelationshipInAComparison() {
        val workspace = layered(
            dir,
            mapView(
                "hl_view",
                OPENED +
                    """
                    highlight:
                      - {source: "shop.api", destination: "shop.billing", label: "bills"}
                    """
            )
        );
        val result = generate(workspace, "--plateau", "to-be", "--against", "baseline", "-i", "hl_view");
        assertEquals(0, result.exit(), result.err());
        assertFalse(result.err().contains("highlight"), result.err());
        val puml = drawn(dir.resolve("views-to-be-vs-baseline"), "hl_view");
        // the state keeps its dash and its grey, the highlight its weight and its glyph after the state's
        assertTrue(puml.contains("-[dashed,thickness=5,#7F7F7F]->"), puml);
        assertTrue(puml.contains("**<U+2212>** **<U+25B6>** **bills**"), puml);
    }

    static Stream<JsonNode> theCases() throws Exception {
        val table = new ObjectMapper().readTree(Files.readString(CASES));
        val cases = new ArrayList<JsonNode>();
        table.get("cases").forEach(c -> {
            if (c.has("exists")) {
                cases.add(c);
            }
        });
        // the table is not empty, and each case that has `exists` says one verdict per entry of its `links`
        assertFalse(cases.isEmpty());
        return cases.stream().peek(c -> {
            val entries = c.get("input").get("links");
            assertEquals(entries.size(), c.get("exists").size(), c.get("name").asText());
        });
    }

    /** DEC-6 (h): the entry names a relationship of its source, the destination equal, the label equal once trimmed. */
    @ParameterizedTest(name = "{0}")
    @MethodSource("theCases")
    @SneakyThrows
    void shouldAgreeWithTheCaseTableOnWhetherAnEntryNamesARelationship(JsonNode c) {
        val table = new ObjectMapper().readTree(Files.readString(CASES));
        val elements = table.get("workspaces").get(c.get("workspace").asText());
        val links = c.get("input").get("links");
        for (var i = 0; i < links.size(); i++) {
            val entry = links.get(i);
            var found = false;
            for (val element : elements) {
                if (!element.get("reference").asText().equals(entry.get("source").asText())) {
                    continue;
                }
                for (val relationship : element.path("relationships")) {
                    found |=
                        relationship.get("destination").asText().equals(entry.get("destination").asText()) &&
                        RelationshipLabel.same(
                            relationship.path("label").asText(null),
                            entry.path("label").asText(null)
                        );
                }
            }
            assertEquals(c.get("exists").get(i).asBoolean(), found, c.get("name").asText() + " links[" + i + "]");
        }
    }
}

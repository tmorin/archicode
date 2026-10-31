package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.manifest.Manifest;
import io.morin.archicode.manifest.ManifestKind;
import io.morin.archicode.workspace.Fold.ReplacesChange;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The five edits of the writer of a fold, on hand-made manifests (wave 028, run 0208, DEC-3). {@link FoldRewrite} is called
 * with data, without a folder, a command line or Quarkus.
 */
class FoldRewriteTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @SneakyThrows
    private static ObjectNode object(String json) {
        return (ObjectNode) JSON.readTree(json);
    }

    private static Manifest element(ManifestKind kind, String plateau, String parent, String content) {
        return Manifest.builder()
            .header(Manifest.Header.builder().kind(kind).version("1").plateau(plateau).parent(parent).build())
            .content(object(content))
            .build();
    }

    private static Manifest plateau(String content) {
        return element(ManifestKind.PLATEAU, null, null, content);
    }

    private static Fold.Plan plan(
        String newParent,
        List<String> headers,
        List<String> deleted,
        List<ReplacesChange> replaces
    ) {
        val rewritten = new java.util.TreeSet<>(headers);
        rewritten.add("b/plateau.yaml");
        replaces
            .stream()
            .map(ReplacesChange::where)
            .filter(w -> !w.startsWith("patch "))
            .forEach(rewritten::add);
        return new Fold.Plan(
            "a",
            "b",
            newParent,
            List.copyOf(rewritten),
            deleted,
            2,
            1,
            replaces,
            List.of(),
            headers,
            "b/plateau.yaml",
            null,
            null
        );
    }

    private static Map<String, Manifest> files(Object... pathsAndManifests) {
        val out = new LinkedHashMap<String, Manifest>();
        for (var i = 0; i < pathsAndManifests.length; i += 2) {
            out.put((String) pathsAndManifests[i], (Manifest) pathsAndManifests[i + 1]);
        }
        return out;
    }

    private static final String FOLDED = """
    {"id":"a","name":"A","horizon":"2026-Q4","patches":[
      {"operator":"REMOVE","target":"shop.old"},{"operator":"SET","target":"shop.web","field":"description","value":"x"}]}
    """;

    private static final String ABOVE = """
    {"id":"b","override":"a","patches":[{"operator":"REMOVE","target":"shop.legacy"}]}
    """;

    @Test
    void shouldNameThePlateauAboveInTheHeadersThatNamedTheFoldedOne() {
        val system = element(ManifestKind.SYSTEM, "a", null, "{\"id\":\"shop\"}");
        val plan = plan("baseline", List.of("a/shop.yaml"), List.of("a/plateau.yaml"), List.of());

        val out = FoldRewrite.apply(
            plan,
            files("a/shop.yaml", system, "a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE))
        );

        assertEquals("b", out.written().get("a/shop.yaml").getHeader().getPlateau());
        assertEquals("shop", out.written().get("a/shop.yaml").getContent().get("id").asText());
    }

    @Test
    void shouldTakeOutTheOverrideWhenTheNewParentIsTheRoot() {
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of());

        val out = FoldRewrite.apply(plan, files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE)));

        assertFalse(out.written().get("b/plateau.yaml").getContent().has("override"));
    }

    @Test
    void shouldOverrideTheParentOfTheFoldedPlateauWhenItIsNotTheRoot() {
        val plan = plan("m", List.of(), List.of("a/plateau.yaml"), List.of());

        val out = FoldRewrite.apply(plan, files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE)));

        assertEquals("m", out.written().get("b/plateau.yaml").getContent().get("override").asText());
    }

    @Test
    void shouldPutThePatchesOfTheFoldedPlateauInFrontOfTheOthers() {
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of());

        val out = FoldRewrite.apply(plan, files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE)));

        val patches = out.written().get("b/plateau.yaml").getContent().get("patches");
        assertEquals(3, patches.size());
        assertEquals("shop.old", patches.get(0).get("target").asText());
        assertEquals("shop.web", patches.get(1).get("target").asText());
        assertEquals("shop.legacy", patches.get(2).get("target").asText());
    }

    @Test
    void shouldDeleteTheManifestOfTheFoldedPlateauAndWriteItNever() {
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of());

        val out = FoldRewrite.apply(plan, files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE)));

        assertEquals(List.of("a/plateau.yaml"), out.deleted());
        assertFalse(out.written().containsKey("a/plateau.yaml"));
    }

    @Test
    void shouldAddNoPatchWhenNoManifestDeclaresTheFoldedPlateau() {
        val plan = plan("baseline", List.of("a/shop.yaml"), List.of(), List.of());
        val system = element(ManifestKind.SYSTEM, "a", null, "{\"id\":\"shop\"}");

        val out = FoldRewrite.apply(plan, files("a/shop.yaml", system, "b/plateau.yaml", plateau(ABOVE)));

        assertEquals(List.of(), out.deleted());
        assertEquals(1, out.written().get("b/plateau.yaml").getContent().get("patches").size());
    }

    @Test
    void shouldReplaceTheReferencesOfAnEntryOfAnElementInPlace() {
        val change = new ReplacesChange(
            "b/shop.yaml",
            "shop.web",
            List.of("shop.a1"),
            List.of("shop.old", "shop.older")
        );
        val system = element(
            ManifestKind.SYSTEM,
            "b",
            null,
            "{\"id\":\"shop\",\"elements\":[{\"kind\":\"container\",\"id\":\"web\",\"replaces\":[\"x\",\"shop.a1\",\"y\"]}]}"
        );
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(change));

        val out = FoldRewrite.apply(
            plan,
            files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE), "b/shop.yaml", system)
        );

        val replaces = out.written().get("b/shop.yaml").getContent().get("elements").get(0).get("replaces");
        assertEquals(List.of("x", "shop.old", "shop.older", "y"), texts(replaces));
    }

    @Test
    void shouldTakeOutReplacesWhenNothingIsLeft() {
        val change = new ReplacesChange("b/shop.yaml", "shop", List.of("shop.a1"), List.of());
        val system = element(ManifestKind.SYSTEM, "b", null, "{\"id\":\"shop\",\"replaces\":[\"shop.a1\"]}");
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(change));

        val out = FoldRewrite.apply(
            plan,
            files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE), "b/shop.yaml", system)
        );

        assertFalse(out.written().get("b/shop.yaml").getContent().has("replaces"));
    }

    @Test
    void shouldNotRepeatAReferenceTheEntryAlreadyHas() {
        val change = new ReplacesChange("b/shop.yaml", "shop", List.of("shop.a1"), List.of("shop.old"));
        val system = element(
            ManifestKind.SYSTEM,
            "b",
            null,
            "{\"id\":\"shop\",\"replaces\":[\"shop.a1\",\"shop.old\"]}"
        );
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(change));

        val out = FoldRewrite.apply(
            plan,
            files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE), "b/shop.yaml", system)
        );

        assertEquals(List.of("shop.old"), texts(out.written().get("b/shop.yaml").getContent().get("replaces")));
    }

    @Test
    void shouldFindANestedElementByItsReference() {
        val change = new ReplacesChange("b/shop.yaml", "shop.web.ui", List.of("shop.a1"), List.of("shop.old"));
        val system = element(
            ManifestKind.SYSTEM,
            "b",
            null,
            "{\"id\":\"shop\",\"elements\":[{\"kind\":\"container\",\"id\":\"web\",\"elements\":[" +
                "{\"kind\":\"component\",\"id\":\"ui\",\"replaces\":[\"shop.a1\"]}]}]}"
        );
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(change));

        val out = FoldRewrite.apply(
            plan,
            files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE), "b/shop.yaml", system)
        );

        val nested = out.written().get("b/shop.yaml").getContent().get("elements").get(0).get("elements").get(0);
        assertEquals(List.of("shop.old"), texts(nested.get("replaces")));
    }

    @Test
    void shouldFindAnElementByItsParentWhenTheManifestIsAChild() {
        val change = new ReplacesChange("b/web.yaml", "shop.web", List.of("shop.a1"), List.of("shop.old"));
        val container = element(ManifestKind.CONTAINER, "b", "shop", "{\"id\":\"web\",\"replaces\":[\"shop.a1\"]}");
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(change));

        val out = FoldRewrite.apply(
            plan,
            files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE), "b/web.yaml", container)
        );

        assertEquals(List.of("shop.old"), texts(out.written().get("b/web.yaml").getContent().get("replaces")));
    }

    @Test
    void shouldComposeAReplacesThatIsAPatchValueText() {
        val change = new ReplacesChange("patch 1 of `b`", "shop.web", List.of("shop.a1"), List.of("shop.old"));
        val above = plateau(
            "{\"id\":\"b\",\"override\":\"a\",\"patches\":[" +
                "{\"operator\":\"SET\",\"target\":\"shop.web\",\"field\":\"replaces\",\"value\":\"shop.a1\"}]}"
        );
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(change));

        val out = FoldRewrite.apply(plan, files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", above));

        val value = out.written().get("b/plateau.yaml").getContent().get("patches").get(2).get("value");
        assertTrue(value.isTextual(), "one reference left stays a text");
        assertEquals("shop.old", value.asText());
    }

    @Test
    void shouldComposeAReplacesThatIsAPatchValueListAndLeaveAnEmptyOne() {
        val first = new ReplacesChange(
            "patch 1 of `b`",
            "shop.web",
            List.of("shop.a1"),
            List.of("shop.old", "shop.older")
        );
        val second = new ReplacesChange("patch 2 of `b`", "shop.db", List.of("shop.a2"), List.of());
        val above = plateau(
            "{\"id\":\"b\",\"override\":\"a\",\"patches\":[" +
                "{\"operator\":\"SET\",\"target\":\"shop.web\",\"field\":\"replaces\",\"value\":[\"shop.a1\"]}," +
                "{\"operator\":\"SET\",\"target\":\"shop.db\",\"field\":\"replaces\",\"value\":\"shop.a2\"}]}"
        );
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of(first, second));

        val out = FoldRewrite.apply(plan, files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", above));

        val patches = out.written().get("b/plateau.yaml").getContent().get("patches");
        assertEquals(List.of("shop.old", "shop.older"), texts(patches.get(2).get("value")));
        assertTrue(patches.get(3).get("value").isArray());
        assertEquals(0, patches.get(3).get("value").size());
    }

    @Test
    void shouldKeepAHeaderThatIsNotTheBusinessOfTheFold() {
        val container = element(ManifestKind.CONTAINER, "a", "yes", "{\"id\":\"web\"}");
        val plan = plan("baseline", List.of("a/web.yaml"), List.of("a/plateau.yaml"), List.of());

        val out = FoldRewrite.apply(
            plan,
            files("a/web.yaml", container, "a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE))
        );

        assertEquals("yes", out.written().get("a/web.yaml").getHeader().getParent());
        assertEquals("1", out.written().get("a/web.yaml").getHeader().getVersion());
        assertEquals(ManifestKind.CONTAINER, out.written().get("a/web.yaml").getKind());
    }

    @Test
    void shouldNotChangeItsArguments() {
        val folded = plateau(FOLDED);
        val above = plateau(ABOVE);
        val system = element(ManifestKind.SYSTEM, "a", null, "{\"id\":\"shop\"}");
        val input = files("a/shop.yaml", system, "a/plateau.yaml", folded, "b/plateau.yaml", above);
        val plan = plan("baseline", List.of("a/shop.yaml"), List.of("a/plateau.yaml"), List.of());

        FoldRewrite.apply(plan, input);

        assertEquals("a", system.getHeader().getPlateau());
        assertEquals(object(ABOVE), above.getContent());
        assertEquals(object(FOLDED), folded.getContent());
        assertEquals(3, input.size());
    }

    @Test
    void shouldGiveTheSameResultTwice() {
        val input = files("a/plateau.yaml", plateau(FOLDED), "b/plateau.yaml", plateau(ABOVE));
        val plan = plan("baseline", List.of(), List.of("a/plateau.yaml"), List.of());

        assertEquals(FoldRewrite.apply(plan, input), FoldRewrite.apply(plan, input));
    }

    private static List<String> texts(JsonNode array) {
        val out = new java.util.ArrayList<String>();
        array.forEach(n -> out.add(n.asText()));
        return out;
    }
}

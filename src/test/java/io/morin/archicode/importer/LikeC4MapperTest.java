package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.LikeC4Mapper.Mapped;
import io.morin.archicode.importer.LikeC4Model.Dropped;
import io.morin.archicode.importer.LikeC4Model.Element;
import io.morin.archicode.importer.LikeC4Model.Link;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

class LikeC4MapperTest {

    private static final Dropped NONE = new Dropped(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    private static Element el(String id, String kind) {
        return new Element(id, kind, null, null, null, List.of());
    }

    private static Link link(String id, String source, String target) {
        return new Link(id, source, target, "uses", null, null, List.of(), false);
    }

    private static LikeC4Model model(List<Element> elements, List<Link> links) {
        return new LikeC4Model("p", "Title", elements, links, NONE);
    }

    private static List<String> paths(Mapped mapped) {
        return mapped.manifests().stream().map(Planned::path).toList();
    }

    private static String error(LikeC4Model model, List<String> maps) {
        return assertThrows(ArchiCodeException.class, () -> LikeC4Mapper.map(model, maps, "f.json")).getMessage();
    }

    @Test
    void defaultKindsNestAndTheHeaderIsTheFullIdAndTheReference() {
        val mapped = LikeC4Mapper.map(
            model(
                List.of(
                    el("shop", "system"),
                    el("shop.web", "container"),
                    el("shop.web.cart", "component"),
                    el("customer", "actor")
                ),
                List.of()
            ),
            List.of(),
            "f.json"
        );
        assertEquals(
            List.of(
                "manifests/shop.yaml",
                "manifests/shop.web.yaml",
                "manifests/shop.web.cart.yaml",
                "manifests/customer.yaml"
            ),
            paths(mapped)
        );
        assertEquals("archicode.morin.io/container", mapped.manifests().get(1).manifest().getKind().getId());
        assertEquals("shop.web", mapped.manifests().get(2).manifest().getHeader().getParent());
        assertEquals(4, mapped.elements());
        assertEquals("Title", mapped.workspace().settings().name());
        assertEquals(List.of("manifests/**"), mapped.workspace().settings().manifests().paths());
        val content = mapped.manifests().get(2).manifest().getContent();
        assertEquals("shop.web.cart", content.get("tags").get("likec4.id").asText());
        assertEquals("component", content.get("tags").get("likec4.kind").asText());
        assertEquals("cart", content.get("name").asText());
    }

    @Test
    void camelCaseGivesNoRewriteButOddCharactersDo() {
        val mapped = LikeC4Mapper.map(
            model(List.of(el("tblUsers", "system"), el("x/y", "system"), el("a b", "system")), List.of()),
            List.of(),
            "f"
        );
        assertEquals(List.of("manifests/tblusers.yaml", "manifests/x_y.yaml", "manifests/a_b.yaml"), paths(mapped));
        assertEquals(List.of("the id of the LikeC4 element x/y is written as x_y"), mapped.rewrites());
    }

    @Test
    void collisionsTakeTheFirstFreeSuffixAndNoPathEscapes() {
        val mapped = LikeC4Mapper.map(
            model(
                List.of(el("appA", "system"), el("appa", "system"), el("appa_2", "system"), el("~x", "system")),
                List.of()
            ),
            List.of(),
            "f"
        );
        assertEquals(
            List.of("manifests/appa.yaml", "manifests/appa_3.yaml", "manifests/appa_2.yaml", "manifests/x.yaml"),
            paths(mapped)
        );
        assertTrue(mapped.rewrites().contains("the id of the LikeC4 element appa is written as appa_3"));
        for (val p : paths(mapped)) {
            assertTrue(p.matches("manifests/[a-z0-9_.-]+\\.yaml"), p);
        }
    }

    @Test
    void aSegmentWithNoLetterTakesTheFallbackWithItsPosition() {
        val mapped = LikeC4Mapper.map(
            model(List.of(el("a", "system"), el("---", "system"), el("a.", "container")), List.of()),
            List.of(),
            "f"
        );
        assertEquals("manifests/a.container_1.yaml", paths(mapped).get(1));
        assertEquals("manifests/system_2.yaml", paths(mapped).get(2));
    }

    @Test
    void siblingsCountedForTheSuffixIncludeTheDroppedOnes() {
        // the person under the system is dropped, but its id still reserves the name
        val mapped = LikeC4Mapper.map(
            model(List.of(el("s", "system"), el("s.dup", "actor"), el("s.Dup", "container")), List.of()),
            List.of(),
            "f"
        );
        assertEquals(List.of("manifests/s.yaml", "manifests/s.dup_2.yaml"), paths(mapped));
    }

    @Test
    void theGivenMappingOverridesTheDefaultAndMapsOtherKinds() {
        val mapped = LikeC4Mapper.map(
            model(List.of(el("s", "system"), el("s.a", "app"), el("s.b", "container")), List.of()),
            List.of("app=container", "container=container"),
            "f"
        );
        assertEquals(3, mapped.elements());
        val system = LikeC4Mapper.map(model(List.of(el("s", "system")), List.of()), List.of("system=person"), "f");
        assertEquals("archicode.morin.io/person", system.manifests().get(0).manifest().getKind().getId());
    }

    @Test
    void everyUnmappedKindIsListedInTheOrderOfItsFirstElement() {
        val m = model(List.of(el("a", "zeta"), el("b", "system"), el("c", "alpha"), el("d", "zeta")), List.of());
        assertEquals(
            "no ArchiCode kind for the LikeC4 kind(s) zeta, alpha: map each with --map <kind>=<person|system|container|component>",
            error(m, List.of())
        );
        assertEquals(
            "no ArchiCode kind for the LikeC4 kind(s) alpha: map each with --map <kind>=<person|system|container|component>",
            error(m, List.of("zeta=system"))
        );
    }

    @Test
    void theErrorsOfTheOptionsComeInTheOrderOfTheDecision() {
        val m = model(List.of(el("a", "zeta"), el("b", "system")), List.of());
        assertEquals(
            "--map zeta is not <kind>=<kind>: write the LikeC4 kind, then =, then person, system, container, component",
            error(m, List.of("zeta"))
        );
        assertEquals(
            "--map zeta= is not <kind>=<kind>: write the LikeC4 kind, then =, then person, system, container, component",
            error(m, List.of("zeta="))
        );
        assertEquals(
            "--map zeta=solution: solution is not an ArchiCode kind: use person, system, container, component",
            error(m, List.of("zeta=solution"))
        );
        assertEquals("--map names the kind zeta twice", error(m, List.of("zeta=system", "zeta=person")));
        // the first malformed option wins over an absent kind and over an unmapped one
        assertEquals(
            "--map nothing is not <kind>=<kind>: write the LikeC4 kind, then =, then person, system, container, component",
            error(m, List.of("ghost=system", "nothing"))
        );
        // an absent kind wins over the unmapped kinds
        assertEquals(
            "--map names the kind ghost, which no element of the model has (kinds: zeta, system)",
            error(m, List.of("ghost=system"))
        );
    }

    @Test
    void aPersonUnderASystemAndAComponentUnderAComponentAreDroppedWithWhatTheyHold() {
        val mapped = LikeC4Mapper.map(
            model(
                List.of(
                    el("s", "system"),
                    el("s.who", "actor"),
                    el("s.who.child", "component"),
                    el("s.c", "container"),
                    el("s.c.k", "component"),
                    el("s.c.k.deep", "component"),
                    el("s.c.k.deep.deeper", "component"),
                    el("s.c.sibling", "component"),
                    el("top", "component")
                ),
                List.of()
            ),
            List.of(),
            "f"
        );
        assertEquals(
            List.of("s", "s.c", "s.c.k", "s.c.sibling"),
            mapped
                .manifests()
                .stream()
                .map(p -> p.manifest().getContent().get("tags").get("likec4.id").asText())
                .toList()
        );
        assertEquals(
            List.of(
                "element s.who (kind actor, mapped to person) dropped: a system (s) cannot hold a person",
                "element s.who.child (kind component, mapped to component) dropped: held by the dropped element s.who",
                "element s.c.k.deep (kind component, mapped to component) dropped: a component (s.c.k) cannot hold a component",
                "element s.c.k.deep.deeper (kind component, mapped to component) dropped: held by the dropped element s.c.k.deep",
                "element top (kind component, mapped to component) dropped: a component cannot be at the top of the layer"
            ),
            mapped.droppedElements()
        );
    }

    @Test
    void relationshipsAreWrittenOnTheirSourceAndTheOthersAreCounted() {
        val bidirectional = new Link("r4", "a", "b", "both", "HTTPS", "requests", List.of("t"), true);
        val mapped = LikeC4Mapper.map(
            model(
                List.of(el("a", "system"), el("b", "system"), el("a.p", "actor")),
                List.of(
                    link("r1", "a", "b"),
                    link("r2", "a", "ghost"),
                    link("r3", "a.p", "b"),
                    new Link("r5", null, "b", null, null, null, List.of(), false),
                    bidirectional
                )
            ),
            List.of(),
            "f"
        );
        assertEquals(2, mapped.relationships());
        assertEquals(3, mapped.droppedRelationships());
        assertEquals(1, mapped.bidirectional());
        val relationships = mapped.manifests().get(0).manifest().getContent().get("relationships");
        assertEquals(2, relationships.size());
        assertEquals("b", relationships.get(0).get("destination").asText());
        assertEquals("uses", relationships.get(0).get("label").asText());
        assertEquals("r1", relationships.get(0).get("tags").get("likec4.id").asText());
        assertFalse(relationships.get(0).get("tags").has("likec4.kind"));
        assertEquals("HTTPS", relationships.get(1).get("qualifiers").get(0).asText());
        assertEquals("t", relationships.get(1).get("qualifiers").get(1).asText());
        assertEquals("requests", relationships.get(1).get("tags").get("likec4.kind").asText());
    }

    @Test
    void aMissingParentIsOneSentence() {
        assertEquals(
            "the LikeC4 element a.b has no parent a in the file",
            error(model(List.of(el("a.b", "system")), List.of()), List.of())
        );
    }

    @Test
    @SneakyThrows
    void theSampleWithTheGoldenMappingWritesTwentyOneAndDropsSix() {
        val root = new ObjectMapper().readTree(Path.of("src/test/resources/likec4/cloud-system.json").toFile());
        val model = LikeC4Reader.read(root, "cloud-system.json", null);
        assertEquals(27, model.elements().size());
        val maps = List.of(
            "app=component",
            "gqlMutation=component",
            "gqlQuery=component",
            "lambda=component",
            "mobileApp=component",
            "queue=component",
            "table=component",
            "externalSystem=system"
        );
        val mapped = LikeC4Mapper.map(model, maps, "cloud-system.json");
        assertEquals(21, mapped.elements());
        assertEquals(6, mapped.droppedElements().size());
        val named = String.join("\n", mapped.droppedElements());
        for (val id : List.of(
            "cloud.supportUser",
            "cloud.legacy.backend.services",
            "cloud.next.graphql.myAccount",
            "cloud.next.graphql.updateAccount",
            "amazon.rds.aurora.tblUsers",
            "amazon.rds.pg.tblUsers"
        )) {
            assertTrue(named.contains("element " + id + " "), id);
        }
        assertEquals("Cloud System", mapped.workspace().settings().name());
    }
}

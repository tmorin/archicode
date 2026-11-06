package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.StructurizrMapper.Mapped;
import io.morin.archicode.importer.StructurizrModel.Component;
import io.morin.archicode.importer.StructurizrModel.Container;
import io.morin.archicode.importer.StructurizrModel.Dropped;
import io.morin.archicode.importer.StructurizrModel.Link;
import io.morin.archicode.importer.StructurizrModel.Person;
import io.morin.archicode.importer.StructurizrModel.System;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.regex.Pattern;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

class StructurizrMapperTest {

    private static final Dropped NONE = new Dropped(0, 0, 0, 0, 0, 0, 0, 0, 0);

    private static Person person(String id, String name) {
        return new Person(id, name, null, List.of(), null);
    }

    private static System system(String id, String name, Container... containers) {
        return new System(id, name, "a system", List.of("Software System"), null, List.of(containers));
    }

    private static Container container(String id, String name, Component... components) {
        return new Container(id, name, null, "Java", List.of("Container", "Database"), "Back", List.of(components));
    }

    private static Component component(String id, String name) {
        return new Component(id, name, null, null, List.of(), null);
    }

    private static Link link(String id, String source, String destination) {
        return new Link(id, source, destination, "uses", "HTTPS", List.of());
    }

    private static StructurizrModel model(List<Person> people, List<System> systems, List<Link> links) {
        return new StructurizrModel("W", people, systems, links, NONE);
    }

    private static List<String> paths(Mapped mapped) {
        return mapped.manifests().stream().map(StructurizrMapper.Planned::path).toList();
    }

    @Test
    void headerKindIsTheFullIdAndTheParentIsTheReference() {
        val mapped = StructurizrMapper.map(
            model(
                List.of(person("1", "User")),
                List.of(system("2", "Bank", container("3", "API", component("4", "Signin")))),
                List.of()
            ),
            "f.json"
        );
        assertEquals(
            List.of(
                "manifests/user.yaml",
                "manifests/bank.yaml",
                "manifests/bank.api.yaml",
                "manifests/bank.api.signin.yaml"
            ),
            paths(mapped)
        );
        var kinds = mapped
            .manifests()
            .stream()
            .map(p -> p.manifest().getKind().getId())
            .toList();
        assertEquals(
            List.of(
                "archicode.morin.io/person",
                "archicode.morin.io/system",
                "archicode.morin.io/container",
                "archicode.morin.io/component"
            ),
            kinds
        );
        assertEquals("bank.api", mapped.manifests().get(3).manifest().getHeader().getParent());
        assertEquals("bank", mapped.manifests().get(2).manifest().getHeader().getParent());
        assertEquals(null, mapped.manifests().get(0).manifest().getHeader().getParent());
        assertEquals("1", mapped.manifests().get(0).manifest().getHeader().getVersion());
        var content = mapped.manifests().get(2).manifest().getContent();
        assertEquals("api", content.get("id").asText());
        assertEquals("[\"Java\",\"Database\"]", content.get("qualifiers").toString());
        assertEquals("{\"structurizr.id\":\"3\",\"group\":\"Back\"}", content.get("tags").toString());
        assertEquals(List.of("manifests/**"), mapped.workspace().settings().manifests().paths());
        assertEquals("W", mapped.workspace().settings().name());
        assertTrue(mapped.rewrites().isEmpty());
    }

    @Test
    void workspaceNameFallsBackToTheFile() {
        var mapped = StructurizrMapper.map(new StructurizrModel(null, List.of(), List.of(), List.of(), NONE), "f.json");
        assertEquals("f.json", mapped.workspace().settings().name());
    }

    @Test
    void siblingsOfDifferentKindsNamedAlikeGetDistinctIds() {
        var mapped = StructurizrMapper.map(
            model(List.of(person("1", "Shop")), List.of(system("2", "Shop")), List.of()),
            "f.json"
        );
        assertEquals(List.of("manifests/shop.yaml", "manifests/shop_2.yaml"), paths(mapped));
        assertEquals(
            List.of("the id of the system \"Shop\" (Structurizr id 2) is written as shop_2"),
            mapped.rewrites()
        );
    }

    @Test
    void aSuffixNeverShadowsASiblingReallyNamedThatWay() {
        var mapped = StructurizrMapper.map(
            model(List.of(), List.of(system("1", "x"), system("2", "x"), system("3", "x_2")), List.of()),
            "f.json"
        );
        assertEquals(List.of("manifests/x.yaml", "manifests/x_3.yaml", "manifests/x_2.yaml"), paths(mapped));
        assertEquals(1, mapped.rewrites().size());
    }

    @Test
    void sameNamesUnderDifferentParentsDoNotCollide() {
        var mapped = StructurizrMapper.map(
            model(
                List.of(),
                List.of(system("1", "A", container("2", "Db")), system("3", "B", container("4", "Db"))),
                List.of()
            ),
            "f.json"
        );
        assertTrue(paths(mapped).containsAll(List.of("manifests/a.db.yaml", "manifests/b.db.yaml")));
        assertTrue(mapped.rewrites().isEmpty());
    }

    @Test
    void caseAndSpacesAreNotARewriteButOtherCharactersAre() {
        var mapped = StructurizrMapper.map(
            model(List.of(), List.of(system("1", "Internet Banking System"), system("2", "Cafe & Bar")), List.of()),
            "f.json"
        );
        assertEquals(List.of("manifests/internet_banking_system.yaml", "manifests/cafe_bar.yaml"), paths(mapped));
        assertEquals(
            List.of("the id of the system \"Cafe & Bar\" (Structurizr id 2) is written as cafe_bar"),
            mapped.rewrites()
        );
    }

    @Test
    void aNameWithNoLetterNorDigitTakesTheFallbackAndNeverEscapesManifests() {
        var mapped = StructurizrMapper.map(
            model(List.of(person("../x", "!!!")), List.of(system("..\\..\\y/", "...")), List.of()),
            "f.json"
        );
        var safe = Pattern.compile("manifests/[a-z0-9_.-]+\\.yaml");
        for (var path : paths(mapped)) {
            assertTrue(safe.matcher(path).matches(), path);
            assertFalse(path.substring("manifests/".length()).contains("/"), path);
            assertFalse(path.contains(".."), path);
        }
        assertEquals("manifests/person__x.yaml", paths(mapped).get(0));
        assertEquals(2, mapped.rewrites().size());
        assertTrue(mapped.rewrites().get(0).contains("Structurizr id ../x"));
    }

    @Test
    void anIdWithADotInANameCannotAddALevel() {
        var mapped = StructurizrMapper.map(model(List.of(), List.of(system("1", "a.b")), List.of()), "f.json");
        assertEquals(List.of("manifests/a_b.yaml"), paths(mapped));
    }

    @Test
    void aMissingNameIsAnError() {
        var model = model(List.of(), List.of(system("1", null)), List.of());
        assertThrows(ArchiCodeException.class, () -> StructurizrMapper.map(model, "f.json"));
    }

    @Test
    void relationshipsAreResolvedWhateverTheOrderAndTheDroppedOnesCounted() {
        var mapped = StructurizrMapper.map(
            model(
                List.of(person("1", "User")),
                List.of(system("2", "Bank", container("3", "API")), system("4", "Mail")),
                List.of(link("10", "3", "4"), link("11", "1", "2"), link("12", "1", "99"), link("13", "98", "2"))
            ),
            "f.json"
        );
        assertEquals(2, mapped.relationships());
        assertEquals(2, mapped.droppedRelationships());
        var api = mapped.manifests().get(2).manifest().getContent().get("relationships");
        assertEquals(
            "[{\"destination\":\"mail\",\"label\":\"uses\",\"qualifiers\":[\"HTTPS\"],\"tags\":{\"structurizr.id\":\"10\"}}]",
            api.toString()
        );
        var user = mapped.manifests().get(0).manifest().getContent().get("relationships");
        assertEquals("bank", user.get(0).get("destination").asText());
    }

    @Test
    @SneakyThrows
    void theSampleGivesUniqueReferencesAndEveryDestinationResolves() {
        var root = new ObjectMapper().readTree(
            Files.readString(Path.of("src/test/resources/structurizr/big-bank-plc.json"))
        );
        var model = StructurizrReader.read(root, "big-bank-plc.json");
        var mapped = StructurizrMapper.map(model, "big-bank-plc.json");
        assertEquals(model.elementCount(), mapped.elements());
        assertEquals(model.elementCount(), mapped.manifests().size());
        assertEquals(model.links().size(), mapped.relationships() + mapped.droppedRelationships());
        var references = new HashSet<String>();
        for (var planned : mapped.manifests()) {
            var reference = planned.path().substring("manifests/".length(), planned.path().length() - ".yaml".length());
            assertTrue(references.add(reference), "duplicate " + reference);
        }
        var resolved = 0;
        for (var planned : mapped.manifests()) {
            var relationships = planned.manifest().getContent().get("relationships");
            if (relationships != null) {
                for (var relationship : relationships) {
                    assertTrue(references.contains(relationship.get("destination").asText()));
                    resolved++;
                }
            }
        }
        assertEquals(mapped.relationships(), resolved);
        for (var planned : mapped.manifests()) {
            var parent = planned.manifest().getHeader().getParent();
            if (parent != null) {
                assertTrue(references.contains(parent), parent);
            }
        }
    }

    @Test
    @SneakyThrows
    void theSameInputGivesTheSameOutputTwice() {
        var root = new ObjectMapper().readTree(
            Files.readString(Path.of("src/test/resources/structurizr/big-bank-plc.json"))
        );
        var model = StructurizrReader.read(root, "big-bank-plc.json");
        assertEquals(StructurizrMapper.map(model, "f"), StructurizrMapper.map(model, "f"));
    }
}

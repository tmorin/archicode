package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

class StructurizrReaderTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @SneakyThrows
    private static JsonNode parse(String json) {
        return JSON.readTree(json);
    }

    @SneakyThrows
    private static JsonNode sample() {
        return JSON.readTree(Files.readString(Path.of("src/test/resources/structurizr/big-bank-plc.json")));
    }

    /** What `jq` counts on the file: the objects of the four arrays that hold the elements, wherever they are in the model. */
    private static int elementsOf(JsonNode node) {
        var count = 0;
        if (node.isObject()) {
            for (var entry : node.properties()) {
                var holdsElements = List.of("people", "softwareSystems", "containers", "components").contains(
                    entry.getKey()
                );
                if (holdsElements && entry.getValue().isArray()) {
                    count += entry.getValue().size();
                }
                if (!"deploymentNodes".equals(entry.getKey()) && !"views".equals(entry.getKey())) {
                    count += elementsOf(entry.getValue());
                }
            }
        } else if (node.isArray()) {
            for (var child : node) {
                count += elementsOf(child);
            }
        }
        return count;
    }

    private static int relationshipsOf(JsonNode model, boolean implied) {
        var count = 0;
        // the relationships between deployment nodes are no relationship between elements: they go with the nodes
        model = model.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) model).remove("deploymentNodes");
        for (var node : model.findParents("sourceId")) {
            if (node.has("linkedRelationshipId") == implied && node.has("destinationId")) {
                count++;
            }
        }
        return count;
    }

    @Test
    void readsTheFourKindsAndTheRelationshipsOfASmallWorkspace() {
        var model = StructurizrReader.read(
            parse(
                """
                {"name":"W","model":{
                  "people":[{"id":"1","name":"User","tags":"Element, Person","relationships":[
                    {"id":"10","sourceId":"1","destinationId":"2","description":"uses","technology":"HTTPS","tags":"Relationship"}]}],
                  "softwareSystems":[{"id":"2","name":"Shop","group":"G","containers":[
                    {"id":"3","name":"Api","technology":"Java","components":[{"id":"4","name":"Ctl","description":"d"}],
                     "relationships":[{"id":"11","sourceId":"3","destinationId":"2","linkedRelationshipId":"10"}]}]}]}}
                """
            ),
            "w.json"
        );
        assertEquals("W", model.name());
        assertEquals(4, model.elementCount());
        assertEquals(List.of("Element", "Person"), model.people().get(0).tags());
        assertEquals("G", model.systems().get(0).group());
        assertEquals("Java", model.systems().get(0).containers().get(0).technology());
        assertEquals("d", model.systems().get(0).containers().get(0).components().get(0).description());
        assertEquals(1, model.links().size());
        assertEquals("10", model.links().get(0).id());
        assertEquals("HTTPS", model.links().get(0).technology());
        assertEquals(1, model.dropped().impliedRelationships());
        assertEquals(1, model.dropped().total());
    }

    @Test
    void aDocumentWithNoModelIsNotAWorkspace() {
        for (var json : List.of("{}", "{\"model\":null}", "[]", "{\"model\":[]}")) {
            var e = assertThrows(ArchiCodeException.class, () -> StructurizrReader.read(parse(json), "x.json"));
            assertEquals("x.json is not a Structurizr workspace: it has no `model`", e.getMessage());
        }
    }

    @Test
    void anElementWithNoNameNamesItsStructurizrId() {
        var e = assertThrows(ArchiCodeException.class, () ->
            StructurizrReader.read(parse("{\"model\":{\"people\":[{\"id\":\"42\"}]}}"), "x.json")
        );
        assertEquals("the person with the Structurizr id `42` has no name", e.getMessage());
        e = assertThrows(ArchiCodeException.class, () ->
            StructurizrReader.read(
                parse(
                    "{\"model\":{\"softwareSystems\":[{\"id\":\"1\",\"name\":\"S\",\"containers\":[{\"id\":7,\"name\":\" \"}]}]}}"
                ),
                "x.json"
            )
        );
        assertEquals("the container with the Structurizr id `7` has no name", e.getMessage());
        assertEquals(1, e.getMessage().lines().count());
    }

    @Test
    void anEmptyModelHasNothingAndDropsNothing() {
        var model = StructurizrReader.read(parse("{\"model\":{}}"), "x.json");
        assertEquals(0, model.elementCount());
        assertEquals(0, model.dropped().total());
    }

    @Test
    void countsWhatItDrops() {
        var model = StructurizrReader.read(
            parse(
                """
                {"properties":{"a":"b"},"configuration":{"scope":"Landscape"},"documentation":{"sections":[{}]},
                 "model":{"customElements":[{"id":"9"}],"deploymentNodes":[{"id":"20","children":[{"id":"21"}]},{"id":"22"}],
                   "people":[{"id":"1","name":"P","perspectives":[{"name":"n"}],"properties":{"k":"v"}}]},
                 "views":{"systemContextViews":[{},{}],"containerViews":[{}],"configuration":{"styles":{"elements":[{},{}],"relationships":[{}]}}}}
                """
            ),
            "x.json"
        );
        var dropped = model.dropped();
        assertEquals(3, dropped.views());
        assertEquals(2, dropped.deploymentNodes());
        assertEquals(3, dropped.styles());
        assertEquals(1, dropped.documentation());
        assertEquals(2, dropped.properties());
        assertEquals(1, dropped.perspectives());
        assertEquals(1, dropped.customElements());
        assertEquals(1, dropped.configuration());
    }

    @Test
    void readsEveryElementAndRelationshipOfTheSample() {
        var root = sample();
        var model = StructurizrReader.read(root, "big-bank-plc.json");
        assertEquals(elementsOf(root.get("model")), model.elementCount());
        assertTrue(model.elementCount() > 0);
        assertEquals(relationshipsOf(root.get("model"), false), model.links().size());
        assertEquals(relationshipsOf(root.get("model"), true), model.dropped().impliedRelationships());
        assertTrue(
            model
                .systems()
                .stream()
                .anyMatch(s -> !s.containers().isEmpty())
        );
    }

    @Test
    void countsEveryDroppedPartTheSampleHas() {
        var root = sample();
        var dropped = StructurizrReader.read(root, "big-bank-plc.json").dropped();
        assertEquals(root.get("model").get("deploymentNodes").size(), dropped.deploymentNodes());
        var views = 0;
        for (var entry : root.get("views").properties()) {
            views += entry.getValue().isArray() ? entry.getValue().size() : 0;
        }
        assertEquals(views, dropped.views());
        assertTrue(dropped.views() > 0);
        assertTrue(dropped.deploymentNodes() > 0);
        assertTrue(dropped.styles() > 0);
        assertTrue(dropped.properties() > 0);
        assertTrue(dropped.impliedRelationships() > 0);
    }
}

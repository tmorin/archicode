package io.morin.archicode.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.importer.LikeC4Model.Dropped;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

class LikeC4ReaderTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @SneakyThrows
    private static JsonNode parse(String json) {
        return JSON.readTree(json);
    }

    @SneakyThrows
    private static ObjectNode sample() {
        return (ObjectNode) JSON.readTree(Files.readString(Path.of("src/test/resources/likec4/cloud-system.json")));
    }

    private static LikeC4Model read(JsonNode root) {
        return LikeC4Reader.read(root, "m.json", null);
    }

    private static void assertRefusal(String expected, Runnable action) {
        var e = assertThrows(ArchiCodeException.class, action::run);
        assertEquals(expected, e.getMessage());
        assertFalse(e.getMessage().contains("\n"), "one line");
    }

    @Test
    void readsEveryElementAndRelationshipOfTheSample() {
        var root = sample();
        var model = read(root);
        assertEquals(root.get("elements").size(), model.elements().size());
        assertEquals(root.get("relations").size(), model.links().size());
        assertFalse(model.elements().isEmpty());
        assertEquals(root.get("projectId").asText(), model.projectId());
        assertEquals(root.at("/project/title").asText(), model.title());
        for (var element : model.elements()) {
            var node = root.get("elements").get(element.id());
            assertEquals(node.get("kind").asText(), element.kind());
            assertEquals(node.get("title").asText(), element.title());
        }
        for (var link : model.links()) {
            var node = root.get("relations").get(link.id());
            assertEquals(node.at("/source/model").asText(), link.source());
            assertEquals(node.at("/target/model").asText(), link.target());
            assertFalse(link.bidirectional());
        }
    }

    @Test
    void readsTheDescriptionTheTechnologyAndTheTagsOfTheSample() {
        var root = sample();
        var model = read(root);
        for (var element : model.elements()) {
            var node = root.get("elements").get(element.id());
            var txt = node.at("/description/txt");
            if (txt.isTextual()) {
                assertEquals(txt.asText(), element.description());
            }
            if (node.hasNonNull("technology")) {
                assertEquals(node.get("technology").asText(), element.technology());
            }
            assertEquals(node.path("tags").size(), element.tags().size());
        }
    }

    @Test
    void countsEveryDroppedPartTheSampleHas() {
        var root = sample();
        var dropped = read(root).dropped();
        assertEquals(root.get("views").size(), dropped.views());
        assertEquals(root.at("/deployments/elements").size(), dropped.deploymentElements());
        assertEquals(root.at("/deployments/relations").size(), dropped.deploymentRelationships());
        assertEquals(root.get("manualLayouts").size(), dropped.manualLayouts());
        assertEquals(count(root, "style"), dropped.styles());
        assertEquals(count(root, "metadata"), dropped.metadata());
        assertEquals(count(root, "links"), dropped.links());
        assertEquals(count(root, "navigateTo"), dropped.navigateTo());
        assertEquals(count(root, "notation"), dropped.notation());
        assertEquals(0, dropped.diffs());
        assertEquals(0, dropped.imports());
        assertEquals(0, dropped.globals() - globals(root));
    }

    private static int count(JsonNode root, String key) {
        var n = 0;
        for (var map : new JsonNode[] { root.get("elements"), root.get("relations") }) {
            for (var node : map) {
                var value = node.get(key);
                n += value == null || value.isNull() || (value.isContainerNode() && value.isEmpty()) ? 0 : 1;
            }
        }
        return n;
    }

    private static int globals(JsonNode root) {
        var n = 0;
        for (var map : root.get("globals")) {
            n += map.size();
        }
        return n;
    }

    @Test
    void countsWhatTheSampleLacksOnACopy() {
        var root = sample();
        ((ObjectNode) root.get("globals").get("styles")).set("a", parse("{}"));
        root.set("imports", parse("{\"x\": {}, \"y\": {}}"));
        root.set("diffs", parse("{\"d\": {}}"));
        var dropped = read(root).dropped();
        assertEquals(globals(root), dropped.globals());
        assertEquals(2, dropped.imports());
        assertEquals(1, dropped.diffs());
    }

    @Test
    void readsABidirectionalRelationshipTagsAndAMarkdownDescription() {
        var root = sample();
        var relation = (ObjectNode) root.get("relations").elements().next();
        relation.put("isBidirectional", true);
        relation.set("tags", parse("[\"a\", \"b\"]"));
        var element = (ObjectNode) root.get("elements").elements().next();
        element.set("description", parse("{\"md\": \"some *md*\"}"));
        var model = read(root);
        var link = model.links().get(0);
        assertTrue(link.bidirectional());
        assertEquals(java.util.List.of("a", "b"), link.tags());
        assertEquals("some *md*", model.elements().get(0).description());
    }

    @Test
    void readsATextDescriptionAndFallsBackOnTheSummary() {
        var model = read(
            parse(
                """
                {"elements": {
                  "a": {"id": "a", "kind": "system", "title": "A", "description": "plain"},
                  "b": {"id": "b", "kind": "system", "title": "B", "description": null, "summary": {"txt": "short"}},
                  "c": {"id": "c", "kind": "system", "title": "C"}
                }}
                """
            )
        );
        assertEquals("plain", model.elements().get(0).description());
        assertEquals("short", model.elements().get(1).description());
        assertNull(model.elements().get(2).description());
        assertEquals(0, model.links().size());
    }

    @Test
    void anEndThatIsNotAModelReferenceIsKeptAsNull() {
        var model = read(
            parse(
                """
                {"elements": {"a": {"id": "a", "kind": "system", "title": "A"}},
                 "relations": {"r": {"id": "r", "source": {"deployment": "x"}, "target": {"model": "a"}, "description": {"txt": "d"}}}}
                """
            )
        );
        assertNull(model.links().get(0).source());
        assertEquals("a", model.links().get(0).target());
        assertEquals("d", model.links().get(0).title());
    }

    @Test
    void anArrayOfOneProjectIsReadAsThatProject() {
        var array = JSON.createArrayNode().add(sample());
        assertEquals(27, LikeC4Reader.read(array, "m.json", null).elements().size());
        assertEquals(27, LikeC4Reader.read(array, "m.json", "cloud-system").elements().size());
    }

    @Test
    void anArrayOfSeveralProjectsNeedsTheProject() {
        ArrayNode array = JSON.createArrayNode().add(sample());
        var other = sample();
        other.put("projectId", "other");
        other.set("elements", parse("{\"z\": {\"id\": \"z\", \"kind\": \"system\", \"title\": \"Z\"}}"));
        array.add(other);
        assertRefusal("m.json holds 2 projects (cloud-system, other): choose one with --project <id>", () ->
            LikeC4Reader.read(array, "m.json", null)
        );
        assertEquals(1, LikeC4Reader.read(array, "m.json", "other").elements().size());
        assertRefusal("m.json holds no project nope: it holds cloud-system, other", () ->
            LikeC4Reader.read(array, "m.json", "nope")
        );
    }

    @Test
    void anObjectWithAnotherProjectIdIsRefusedAndOneWithNoneIgnoresTheOption() {
        assertRefusal("m.json holds no project nope: it holds cloud-system", () ->
            LikeC4Reader.read(sample(), "m.json", "nope")
        );
        var noId = parse("{\"elements\": {}}");
        assertEquals(0, LikeC4Reader.read(noId, "m.json", "any").elements().size());
    }

    @Test
    void whatIsNotAnExportIsRefused() {
        assertRefusal("m.json is not a LikeC4 JSON export", () -> read(parse("[]")));
        assertRefusal("m.json is not a LikeC4 JSON export", () -> read(parse("42")));
        assertRefusal("m.json is not a LikeC4 JSON export", () -> read(parse("\"text\"")));
        assertRefusal("m.json is not a LikeC4 JSON export", () -> read(parse("[1]")));
        assertRefusal("m.json is not a LikeC4 JSON export: it has no elements", () -> read(parse("{}")));
        assertRefusal("m.json is not a LikeC4 JSON export: it has no elements", () ->
            read(parse("{\"elements\": []}"))
        );
    }

    @Test
    void anElementWithNoKindOrNoParentIsRefused() {
        assertRefusal("the LikeC4 element a has no kind", () ->
            read(parse("{\"elements\": {\"a\": {\"id\": \"a\", \"title\": \"A\"}}}"))
        );
        assertRefusal("the LikeC4 element a.b has no parent a in the file", () ->
            read(parse("{\"elements\": {\"a.b\": {\"id\": \"a.b\", \"kind\": \"system\"}}}"))
        );
    }

    @Test
    void theSampleWithAMissingParentIsRefused() {
        var root = sample();
        ((ObjectNode) root.get("elements")).remove("cloud");
        var e = assertThrows(ArchiCodeException.class, () -> read(root));
        assertTrue(e.getMessage().endsWith("has no parent cloud in the file"), e.getMessage());
    }

    @Test
    void theDroppedRecordIsEmptyOnAnEmptyModel() {
        assertEquals(new Dropped(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), read(parse("{\"elements\": {}}")).dropped());
    }
}

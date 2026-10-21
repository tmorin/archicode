package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class ViewpointKernelTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @SneakyThrows
    private com.fasterxml.jackson.databind.JsonNode compute(String json) {
        return objectMapper.readTree(ViewpointKernel.getInstance().compute(json));
    }

    @Test
    void shouldAnswerWithTheContractVersion() {
        val out = compute(
            """
            {"viewpoint":"overview","layer":"application","focal":"a","elements":[
              {"reference":"a","relationships":[{"destination":"b","label":"calls"}]},{"reference":"b"}]}
            """
        );
        Assertions.assertEquals(ViewpointKernel.CONTRACT_VERSION, out.get("version").asInt());
        Assertions.assertEquals("a", out.get("links").get(0).get("from").asText());
        Assertions.assertEquals("calls", out.get("links").get(0).get("label").asText());
    }

    @Test
    void shouldReportMistakesInsteadOfThrowing() {
        Assertions.assertTrue(compute("{").get("error").asText().contains("invalid input"));
        Assertions.assertTrue(
            compute("{\"viewpoint\":\"sideways\",\"focal\":\"a\",\"elements\":[]}")
                .get("error")
                .asText()
                .contains("unsupported")
        );
    }

    @Test
    void shouldBeUsableAgainAfterAnError() {
        compute("{");
        Assertions.assertEquals(
            ViewpointKernel.CONTRACT_VERSION,
            compute("{\"viewpoint\":\"deep\",\"focal\":\"a\",\"elements\":[{\"reference\":\"a\"}]}")
                .get("version")
                .asInt()
        );
    }

    @Test
    @SneakyThrows
    void shouldApplyAFacetToTheJsonOfAWorkspace() {
        val out = objectMapper.readTree(
            ViewpointKernel.getInstance().applyFacet(
                """
                {"workspace":{"application":{"elements":[
                   {"id":"a","relationships":[
                     {"destination":"b","tags":{"audited":"yes"}},
                     {"destination":"b","label":"keeps"}]},
                   {"id":"b"}]}},
                 "actions":[{"operator":"REMOVE","json_path":"$..relationships[?(@.tags['audited'] == 'yes')]"}]}
                """
            )
        );
        Assertions.assertEquals(ViewpointKernel.CONTRACT_VERSION, out.get("version").asInt());
        val relationships = out.at("/workspace/application/elements/0/relationships");
        Assertions.assertEquals(1, relationships.size());
        Assertions.assertEquals("keeps", relationships.get(0).get("label").asText());
        Assertions.assertEquals(0, out.get("warnings").size());
    }

    @Test
    @SneakyThrows
    void shouldRefuseThePathsOfTheEarlierDialectAndWhatItCannotRead() {
        // the cases are shared with the kernel's own tests and the editor's (facet-dialect-cases.json)
        val cases = objectMapper.readTree(
            java.nio.file.Files.readString(
                java.nio.file.Path.of("src/test/javascript/viewpoint-kernel/facet-dialect-cases.json")
            )
        );
        for (val c : cases.get("refused")) {
            val request = objectMapper.createObjectNode();
            request.putObject("workspace").putObject("application").putArray("elements");
            request.putArray("actions").addObject().put("operator", "REMOVE").put("json_path", c.get("path").asText());
            val refused = objectMapper.readTree(ViewpointKernel.getInstance().applyFacet(request.toString()));
            Assertions.assertEquals(c.get("error").asText(), refused.get("error").asText(), c.get("id").asText());
        }
        for (val path : cases.get("accepted")) {
            val request = objectMapper.createObjectNode();
            request.putObject("workspace").putObject("application").putArray("elements");
            request.putArray("actions").addObject().put("operator", "REMOVE").put("json_path", path.asText());
            val out = objectMapper.readTree(ViewpointKernel.getInstance().applyFacet(request.toString()));
            Assertions.assertFalse(out.has("error"), path.asText());
            Assertions.assertEquals(0, out.get("warnings").size(), path.asText());
        }
        val refused = objectMapper.readTree(
            ViewpointKernel.getInstance().applyFacet(
                "{\"workspace\":{},\"actions\":[{\"operator\":\"REMOVE\",\"json_path\":\"$..x[?(@.a == \"}]}"
            )
        );
        Assertions.assertTrue(refused.get("error").asText().contains("invalid facet JSONPath"));
    }

    @Test
    void shouldKeepTheOrderOfTheKeysOfTheWorkspace() {
        val out = ViewpointKernel.getInstance().applyFacet(
            """
            {"workspace":{"styles":{"by-tags":{"external":{},"new":{},"changed":{}}},"application":{}},"actions":[]}
            """
        );
        Assertions.assertTrue(out.indexOf("\"external\"") < out.indexOf("\"new\""), out);
        Assertions.assertTrue(out.indexOf("\"new\"") < out.indexOf("\"changed\""), out);
        Assertions.assertTrue(out.indexOf("\"styles\"") < out.indexOf("\"application\""), out);
    }

    @Test
    @SneakyThrows
    void shouldApplyThePatchesOfAPlateauToTheJsonOfAWorkspace() {
        val out = objectMapper.readTree(
            ViewpointKernel.getInstance().applyPatches(
                """
                {"plateau":"saas","workspace":{"application":{"elements":[
                   {"id":"a","relationships":[{"destination":"b","label":"calls"}]},{"id":"b"}]},
                 "technology":{"elements":[{"id":"n","applications":["a","b"]}]}},
                 "patches":[
                   {"operator":"SET","target":"a","field":"name","value":"A"},
                   {"operator":"REMOVE","target":"b"}]}
                """
            )
        );
        Assertions.assertEquals(ViewpointKernel.CONTRACT_VERSION, out.get("version").asInt());
        Assertions.assertEquals("A", out.at("/workspace/application/elements/0/name").asText());
        Assertions.assertEquals(0, out.at("/workspace/application/elements/0/relationships").size());
        Assertions.assertEquals(1, out.at("/workspace/technology/elements/0/applications").size());
        Assertions.assertEquals(2, out.get("patches").size());
        Assertions.assertEquals("b", out.at("/patches/1/removed/0/reference").asText());
        Assertions.assertEquals("relationships", out.at("/patches/1/dropped/0/field").asText());
    }

    @Test
    @SneakyThrows
    void shouldNameThePlateauTheRankAndTheSelectorOfThePatchThatMissed() {
        val out = objectMapper.readTree(
            ViewpointKernel.getInstance().applyPatches(
                """
                {"plateau":"saas","workspace":{"application":{"elements":[{"id":"a"}]}},
                 "patches":[{"operator":"SET","target":"a","field":"name","value":"A"},
                            {"operator":"REMOVE","target":"cart"}]}
                """
            )
        );
        Assertions.assertEquals(
            "plateau saas: patch 2 (REMOVE target cart): selects nothing, there is no element cart in the application layer",
            out.get("error").asText()
        );
        Assertions.assertEquals(2, out.at("/patch/rank").asInt());
        Assertions.assertEquals("saas", out.at("/patch/plateau").asText());
        Assertions.assertEquals("target cart", out.at("/patch/selector").asText());
        Assertions.assertFalse(out.has("workspace"));
    }
}

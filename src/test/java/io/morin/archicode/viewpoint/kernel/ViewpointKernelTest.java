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
    void shouldWarnAboutThePathsOfTheEarlierDialectAndRefuseWhatItCannotRead() {
        val warned = objectMapper.readTree(
            ViewpointKernel.getInstance().applyFacet(
                """
                {"workspace":{"application":{"elements":[]}},
                 "actions":[{"operator":"REMOVE","json_path":"$..relationships[?(@.qualifiers anyof ['a'])]"}]}
                """
            )
        );
        Assertions.assertEquals(1, warned.get("warnings").size());
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
}

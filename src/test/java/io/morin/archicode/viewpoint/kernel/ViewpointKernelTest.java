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
}

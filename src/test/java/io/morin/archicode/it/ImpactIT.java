package io.morin.archicode.it;

import static io.morin.archicode.it.Shipped.payload;
import static io.morin.archicode.it.Shipped.said;
import static io.morin.archicode.it.Shipped.succeeded;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.main.LaunchResult;
import io.quarkus.test.junit.main.QuarkusMainIntegrationTest;
import io.quarkus.test.junit.main.QuarkusMainLauncher;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@code archicode query impact} on the packaged application, the jar under the JVM and the native runner under
 * {@code -Dnative}: an answer, the deployments followed with {@code --through}, a reference that is no element and a depth
 * below 1, on a copy of a shipped workspace (two systems and nodes that host them).
 */
@QuarkusMainIntegrationTest
class ImpactIT {

    private static final Path DEPLOYMENTS = Path.of("src/test/workspaces/case_graph_deployments.yaml");
    private static final ObjectMapper JSON = new ObjectMapper();

    @TempDir
    Path dir;

    @SneakyThrows
    private String workspace() {
        val target = dir.resolve(".archicode.yaml");
        if (!Files.exists(target)) {
            Files.copy(DEPLOYMENTS, target);
        }
        return target.toString();
    }

    private LaunchResult impact(QuarkusMainLauncher launcher, String... arguments) {
        val all = new ArrayList<String>(List.of("query", "impact", "-w", workspace()));
        all.addAll(List.of(arguments));
        return launcher.launch(all.toArray(String[]::new));
    }

    @SneakyThrows
    private static JsonNode answer(LaunchResult result) {
        succeeded(result);
        val text = payload(result);
        assertEquals(1, text.lines().count(), () -> said(result));
        return JSON.readTree(text);
    }

    private static List<String> references(JsonNode json) {
        val out = new ArrayList<String>();
        json.get("reached").forEach(r -> out.add(r.get("reference").asText()));
        return out;
    }

    private static void refused(LaunchResult result, String sentence) {
        assertEquals(1, result.exitCode(), () -> said(result));
        val error = result.getErrorOutput().strip();
        assertTrue(error.startsWith("error: ") && error.contains(sentence), () -> said(result));
        assertEquals(1, error.lines().count(), () -> said(result));
        assertFalse(error.contains("\tat "), () -> said(result));
        assertEquals("", payload(result), () -> said(result));
    }

    @Test
    void shouldAnswerWithWhatPointsAtTheElement(QuarkusMainLauncher launcher) {
        val json = answer(impact(launcher, "sol.sys_a"));

        assertEquals("sol.sys_a", json.get("start").asText());
        assertEquals("in", json.get("direction").asText());
        assertEquals(List.of("sol.sys_b"), references(json));
        val reached = json.get("reached").get(0);
        assertEquals(1, reached.get("distance").asInt());
        assertEquals("sol.sys_b", reached.get("via").get("source").asText());
        assertEquals("sol.sys_a", reached.get("via").get("destination").asText());
    }

    @Test
    void shouldFollowTheDeploymentsWhenAsked(QuarkusMainLauncher launcher) {
        val json = answer(impact(launcher, "sol.sys_a", "--through", "deployments"));

        assertEquals(List.of("env.alpha", "env.beta"), references(json));
        assertTrue(json.get("reached").get(0).get("via").get("deployment").asBoolean());
        assertEquals(
            List.of("sol.sys_b"),
            references(answer(impact(launcher, "sol.sys_a", "--through", "relationships")))
        );
    }

    @Test
    void shouldRefuseAReferenceThatIsNoElement(QuarkusMainLauncher launcher) {
        refused(impact(launcher, "nowhere"), "the element `nowhere` does not exist");
    }

    @Test
    void shouldRefuseADepthBelowOne(QuarkusMainLauncher launcher) {
        refused(impact(launcher, "sol.sys_a", "--depth", "0"), "the depth must be 1 or more: `0`");
    }
}

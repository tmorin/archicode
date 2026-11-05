package io.morin.archicode.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.MapperFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

/** {@code archicode query impact}: its options, its JSON and its refusals, run through the command line of the application. */
@QuarkusTest
class ImpactQueryTest {

    private static final String DEPLOYMENTS = "src/test/workspaces/case_graph_deployments.yaml";
    private static final String MODEL = "docs/architecture/.archicode.yaml";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject
    CommandLine.IFactory factory;

    @Inject
    ErrorOutput errorOutput;

    @Inject
    MapperFactory mapperFactory;

    private record Result(int exit, String out, String err) {}

    private Result run(String workspace, String... args) {
        val all = new ArrayList<String>(List.of("query", "impact", "-w", workspace));
        all.addAll(List.of(args));
        val out = new ByteArrayOutputStream();
        val err = new ByteArrayOutputStream();
        val previousOut = System.out;
        System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));
        try {
            val commandLine = new CommandLine(ArchiCode.class, factory);
            commandLine.setErr(new PrintWriter(err, true, StandardCharsets.UTF_8));
            errorOutput.install(commandLine);
            val exit = commandLine.execute(all.toArray(String[]::new));
            return new Result(exit, out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
        } finally {
            System.setOut(previousOut);
        }
    }

    @SneakyThrows
    private JsonNode ok(String workspace, String... args) {
        val result = run(workspace, args);
        assertEquals(0, result.exit(), result.err());
        assertEquals(1, result.out().lines().count(), "one line of JSON");
        return JSON.readTree(result.out());
    }

    private static List<String> references(JsonNode json) {
        val references = new ArrayList<String>();
        json.get("reached").forEach(r -> references.add(r.get("reference").asText()));
        return references;
    }

    private void assertRefused(Result result, String sentence) {
        assertEquals(1, result.exit(), result.err());
        assertEquals(1, result.err().lines().count(), result.err());
        assertTrue(result.err().startsWith("error: "), result.err());
        assertTrue(result.err().contains(sentence), result.err());
        assertEquals("", result.out(), "nothing on the standard output");
    }

    @Test
    void shouldWriteTheKeysInOrderWithTheDefaults() {
        val json = ok(DEPLOYMENTS, "sol.sys_a");

        val keys = new ArrayList<String>();
        json.fieldNames().forEachRemaining(keys::add);
        assertEquals(List.of("start", "direction", "depth", "reached"), keys);
        assertEquals("sol.sys_a", json.get("start").asText());
        assertEquals("in", json.get("direction").asText());
        assertTrue(json.get("depth").isNull(), "an unbounded depth is written as null");
        assertEquals(List.of("sol.sys_b"), references(json));
        val reached = json.get("reached").get(0);
        assertEquals(1, reached.get("distance").asInt());
        assertEquals("sol.sys_b", reached.get("via").get("source").asText());
        assertEquals("sol.sys_a", reached.get("via").get("destination").asText());
        assertEquals("calls", reached.get("via").get("label").asText());
        assertFalse(reached.get("via").has("deployment"), "deployment is written only when true");
        assertFalse(reached.get("via").has("qualifiers"), "no qualifiers, none written");
    }

    @Test
    void shouldWriteAnEmptyReachedAndTheDirectionInLowercase() {
        val json = ok(DEPLOYMENTS, "sol.sys_b", "--direction", "in", "--depth", "3");

        assertTrue(json.get("reached").isArray() && json.get("reached").isEmpty());
        assertEquals(3, json.get("depth").asInt());
        assertEquals("in", json.get("direction").asText());
    }

    @Test
    void shouldFollowTheDirectionAndAcceptItInAnyCase() {
        assertEquals(List.of("sol.sys_a"), references(ok(DEPLOYMENTS, "sol.sys_b", "--direction", "OUT")));
        assertEquals("out", ok(DEPLOYMENTS, "sol.sys_b", "--direction", "out").get("direction").asText());
        assertEquals(List.of("sol.sys_a"), references(ok(DEPLOYMENTS, "sol.sys_b", "--direction", "both")));
    }

    @Test
    void shouldFollowDeploymentsAndMarkThem() {
        val json = ok(DEPLOYMENTS, "sol.sys_a", "--through", "deployments", "--direction", "in");

        assertEquals(List.of("env.alpha", "env.beta"), references(json));
        val via = json.get("reached").get(0).get("via");
        assertEquals("env.alpha", via.get("source").asText());
        assertEquals("sol.sys_a", via.get("destination").asText());
        assertTrue(via.get("deployment").asBoolean());
        assertFalse(via.has("label"));
    }

    @Test
    void shouldIgnoreAQualifierWhenOnlyDeploymentsAreFollowed() {
        assertEquals(
            references(ok(DEPLOYMENTS, "sol.sys_a", "--through", "deployments")),
            references(ok(DEPLOYMENTS, "sol.sys_a", "--through", "deployments", "--qualifier", "nothing"))
        );
    }

    @Test
    void shouldFilterRelationshipsByQualifier() {
        assertEquals(List.of(), references(ok(MODEL, "agent", "--qualifier", "no-such-qualifier")));
    }

    @Test
    void shouldAnswerOnTheModelOfArchiCode() {
        val json = ok(MODEL, "agent", "--direction", "both");

        assertFalse(json.get("reached").isEmpty());
        val distances = new ArrayList<Integer>();
        json.get("reached").forEach(r -> distances.add(r.get("distance").asInt()));
        assertEquals(distances.stream().sorted().toList(), distances, "sorted by distance");
    }

    @Test
    void shouldPrintTheSameBytesTwice() {
        assertEquals(
            run(MODEL, "agent", "--direction", "both").out(),
            run(MODEL, "agent", "--direction", "both").out()
        );
    }

    @Test
    void shouldRefuseAnElementThatDoesNotExist() {
        assertRefused(run(MODEL, "nowhere"), "the element `nowhere` does not exist");
    }

    @Test
    void shouldRefuseADepthBelowOne() {
        assertRefused(run(MODEL, "agent", "--depth", "0"), "the depth must be 1 or more: `0`");
        assertRefused(run(MODEL, "agent", "--depth", "-1"), "the depth must be 1 or more: `-1`");
        assertRefused(run(MODEL, "agent", "--depth=-1"), "the depth must be 1 or more: `-1`");
    }

    @Test
    void shouldCheckTheDepthBeforeTheWorkspaceIsLoaded() {
        assertRefused(
            run("src/test/workspaces/does-not-exist.yaml", "x", "--depth", "0"),
            "the depth must be 1 or more"
        );
    }

    @Test
    void shouldLeaveAUsageErrorToPicocli() {
        assertEquals(2, run(MODEL, "agent", "--direction", "sideways").exit());
        assertEquals(2, run(MODEL, "agent", "--through", "elsewhere").exit());
        assertEquals(2, run(MODEL, "agent", "--depth", "many").exit());
    }
}

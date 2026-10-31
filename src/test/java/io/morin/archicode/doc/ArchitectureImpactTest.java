package io.morin.archicode.doc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import picocli.CommandLine;

/**
 * The impact oracle (wave 029, run 0210, DEC-1 to DEC-3): the questions of
 * {@code src/test/javascript/architecture/impact-questions.json} are answered from {@code query graph} of the model of
 * ArchiCode itself, with the exact set of references each one expects. The walk is breadth first over the flat
 * {@code relationships} list; a start covers its descendants by reference prefix, an element reached in a later hop
 * covers its descendants too, and the answer leaves out the starts and their descendants.
 */
@QuarkusTest
class ArchitectureImpactTest {

    private static final Path WORKSPACE = Path.of("docs/architecture/.archicode.yaml");
    private static final Path QUESTIONS = Path.of("src/test/javascript/architecture/impact-questions.json");

    @Inject
    CommandLine.IFactory factory;

    @Inject
    io.morin.archicode.cli.ErrorOutput errorOutput;

    record Question(
        String id,
        String ask,
        List<String> start,
        String direction,
        List<String> qualifiers,
        Integer depth,
        List<String> expect
    ) {}

    @SneakyThrows
    private static List<Question> questions() {
        val mapper = new ObjectMapper();
        val result = new ArrayList<Question>();
        for (val q : mapper.readTree(QUESTIONS.toFile()).get("questions")) {
            result.add(
                new Question(
                    q.get("id").asText(),
                    q.get("ask").asText(),
                    texts(q.get("start")),
                    q.get("direction").asText(),
                    texts(q.get("qualifiers")),
                    q.get("depth").isNull() ? null : q.get("depth").asInt(),
                    texts(q.get("expect"))
                )
            );
        }
        return result;
    }

    private static List<String> texts(JsonNode array) {
        val result = new ArrayList<String>();
        array.forEach(n -> result.add(n.asText()));
        return result;
    }

    private static boolean covers(String ancestor, String reference) {
        return reference.equals(ancestor) || reference.startsWith(ancestor + ".");
    }

    private static boolean coveredByAny(Set<String> ancestors, String reference) {
        return ancestors.stream().anyMatch(a -> covers(a, reference));
    }

    private static Set<String> elementReferences(JsonNode graph) {
        val result = new HashSet<String>();
        graph.get("elements").forEach(root -> collect(root.get("reference").asText(), root.get("element"), result));
        return result;
    }

    private static void collect(String reference, JsonNode element, Set<String> into) {
        into.add(reference);
        val children = element.get("elements");
        if (children != null) {
            children.forEach(child -> collect(reference + "." + child.get("id").asText(), child, into));
        }
    }

    private static boolean carriesOne(JsonNode relationship, List<String> qualifiers) {
        for (val qualifier : relationship.get("relationship").path("qualifiers")) {
            if (qualifiers.contains(qualifier.asText())) {
                return true;
            }
        }
        return false;
    }

    /** The references the question answers, sorted; fails when a start is not in the graph. */
    static Set<String> impact(JsonNode graph, Question q) {
        val known = elementReferences(graph);
        for (val start : q.start()) {
            assertTrue(known.contains(start), q.id() + " starts at `" + start + "`, which the model does not have");
        }
        val in = !"out".equals(q.direction());
        val out = !"in".equals(q.direction());
        val starts = new HashSet<>(q.start());
        val visited = new HashSet<>(starts);
        val answer = new TreeSet<String>();
        var frontier = new ArrayDeque<>(q.start());
        var hop = 0;
        while (!frontier.isEmpty() && (q.depth() == null || hop < q.depth())) {
            hop++;
            val next = new ArrayDeque<String>();
            for (val relationship : graph.get("relationships")) {
                if (!carriesOne(relationship, q.qualifiers())) {
                    continue;
                }
                val source = relationship.get("source").asText();
                val destination = relationship.get("relationship").get("destination").asText();
                if (out && coveredByAny(new HashSet<>(frontier), source)) {
                    reach(destination, visited, starts, answer, next);
                }
                if (in && coveredByAny(new HashSet<>(frontier), destination)) {
                    reach(source, visited, starts, answer, next);
                }
            }
            frontier = next;
        }
        return answer;
    }

    private static void reach(
        String reference,
        Set<String> visited,
        Set<String> starts,
        Set<String> answer,
        Deque<String> next
    ) {
        if (coveredByAny(visited, reference)) {
            return;
        }
        visited.add(reference);
        next.add(reference);
        if (!coveredByAny(starts, reference)) {
            answer.add(reference);
        }
    }

    static void check(JsonNode graph, Question q) {
        assertFalse(q.qualifiers().isEmpty(), q.id() + " must say which couplings it follows");
        assertFalse(q.expect().isEmpty(), q.id() + " expects nothing: an empty answer proves nothing");
        val expected = new TreeSet<>(q.expect());
        val actual = impact(graph, q);
        val missing = new TreeSet<>(expected);
        missing.removeAll(actual);
        val unexpected = new TreeSet<>(actual);
        unexpected.removeAll(expected);
        assertEquals(
            expected,
            actual,
            q.id() +
                " `" +
                q.ask() +
                "`: missing " +
                missing +
                ", unexpected " +
                unexpected +
                "; if the coupling changed on purpose, change the model and this question together"
        );
    }

    private JsonNode graph() {
        return ArchitectureGraph.load(WORKSPACE, factory, errorOutput);
    }

    @Test
    void shouldAskSixToEightQuestionsWithDistinctIds() {
        val ids = questions().stream().map(Question::id).toList();
        assertTrue(ids.size() >= 6 && ids.size() <= 8, "6 to 8 questions: " + ids);
        assertEquals(ids.size(), new HashSet<>(ids).size(), "distinct ids: " + ids);
    }

    @TestFactory
    Stream<DynamicTest> shouldAnswerEveryQuestionWithItsExpectedElements() {
        val graph = graph();
        return questions()
            .stream()
            .map(q -> DynamicTest.dynamicTest(q.id() + " " + q.ask(), () -> check(graph, q)));
    }

    /** Sabotage (b): without the calls of the presentation layer towards the kernel, Q01 must change. */
    @Test
    void shouldChangeQ01WhenPresentationNoLongerCallsTheKernel() {
        val graph = graph().deepCopy();
        val relationships = (ArrayNode) graph.get("relationships");
        val kept = new ArrayList<JsonNode>();
        var removed = 0;
        for (val relationship : relationships) {
            val source = relationship.get("source").asText();
            val destination = relationship.get("relationship").get("destination").asText();
            if (
                covers("archicode.editor.presentation", source) &&
                covers("archicode.kernel.engine", destination) &&
                carriesOne(relationship, List.of("calls"))
            ) {
                removed++;
            } else {
                kept.add(relationship);
            }
        }
        assertTrue(removed > 0, "the model has calls from editor.presentation to kernel.engine");
        relationships.removeAll();
        kept.forEach(relationships::add);
        val q01 = questions()
            .stream()
            .filter(q -> "Q01".equals(q.id()))
            .findFirst()
            .orElseThrow();
        assertNotEquals(new TreeSet<>(q01.expect()), impact(graph, q01), "Q01 must notice the missing calls");
        assertThrowsAssertion(() -> check(graph, q01));
    }

    /** Sabotage (a): without the owns relationship of the core layer, Q05 must fail. */
    @Test
    void shouldFailQ05WhenTheOwnsRelationshipIsMissing() {
        val graph = graph().deepCopy();
        val relationships = (ArrayNode) graph.get("relationships");
        val kept = new ArrayList<JsonNode>();
        var removed = 0;
        for (val relationship : relationships) {
            if (carriesOne(relationship, List.of("owns"))) {
                removed++;
            } else {
                kept.add(relationship);
            }
        }
        assertTrue(removed > 0, "the model has an owns relationship");
        relationships.removeAll();
        kept.forEach(relationships::add);
        val q05 = questions()
            .stream()
            .filter(q -> "Q05".equals(q.id()))
            .findFirst()
            .orElseThrow();
        assertNotEquals(new TreeSet<>(q05.expect()), impact(graph, q05), "Q05 must notice the missing owner");
        assertThrowsAssertion(() -> check(graph, q05));
    }

    private static void assertThrowsAssertion(Runnable run) {
        try {
            run.run();
        } catch (AssertionError expected) {
            return;
        }
        throw new AssertionError("the check was expected to fail");
    }
}

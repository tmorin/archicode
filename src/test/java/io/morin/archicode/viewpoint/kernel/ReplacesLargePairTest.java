package io.morin.archicode.viewpoint.kernel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.workspace.WorkspaceFactory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * How right the candidates of {@code replaces} are on a pair of plateaus as large as a real one (issue #33).
 *
 * <p>The pair is the invented harbour of {@code src/test/resources/replaces-large-pair}: some 750 elements per plateau,
 * with renames, moves, splits and merges planted in it, and decoys (a lone sibling that is another thing, the same name
 * in other kinds, layers and parents, close descriptions of unrelated things). {@code answers.json} lists what was
 * planted: the pairs that <em>are</em> one thing said twice (<em>same</em>) and the false friends (<em>notSame</em>).
 * Any other pair of a removed and a new element is not one thing either.
 *
 * <p>The numbers are <strong>recorded</strong> in {@code recorded-candidates.txt}, not required to be good: the test
 * fails when a change to the kernel's thresholds ({@code CLOSE_DESCRIPTION}, {@code LEAST_WORDS}), to the lone-sibling
 * rule or to the name rule moves them, so that a change to the rule is a decision with its numbers in front of it. To
 * accept the new numbers, run the test once with {@code -DrecordReplacesLargePair=true} and read the diff of the file.
 * They say how the rule behaves against what was planted in an invented harbour, <strong>not</strong> how it behaves on
 * a real workspace: the share of each kind of case (a rename with the description kept, a boilerplate description, a
 * lone sibling, a component with a generic name) is whatever the generator planted.
 */
@QuarkusTest
class ReplacesLargePairTest {

    private static final Path FIXTURE = Path.of("src/test/resources/replaces-large-pair");
    private static final Path WORKSPACE = FIXTURE.resolve(".archicode.yaml");

    @Inject
    WorkspaceFactory workspaceFactory;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Comparison compare(String base, String target) {
        val path = WORKSPACE.toAbsolutePath();
        return new PlateauComparer(objectMapper).compare(
            workspaceFactory.create(path, null, base),
            workspaceFactory.create(path, null, target)
        );
    }

    @SneakyThrows
    private JsonNode answers() {
        return objectMapper.readTree(Files.readString(FIXTURE.resolve("answers.json")));
    }

    private static String key(String fromLayer, String from, String toLayer, String to) {
        return fromLayer + ":" + from + " -> " + toLayer + ":" + to;
    }

    private static String key(JsonNode answer) {
        val layer = answer.has("layer") ? answer.get("layer").asText() : null;
        val fromLayer = layer != null ? layer : answer.get("fromLayer").asText();
        val toLayer = layer != null ? layer : answer.get("toLayer").asText();
        return key(fromLayer, answer.get("from").asText(), toLayer, answer.get("to").asText());
    }

    private static String key(Comparison.Candidate candidate) {
        return key(candidate.layer(), candidate.from(), candidate.layer(), candidate.to());
    }

    /** The pair is a few hundred elements per plateau, more than the ~170 of the real pair wave 008 measured. */
    @Test
    void thePairIsLarge() {
        val elements = answers().get("elements");
        for (val plateau : List.of("before", "after")) {
            val total =
                elements.get(plateau).get("application").asInt() + elements.get(plateau).get("technology").asInt();
            assertTrue(total >= 500, plateau + " has " + total + " elements");
        }
    }

    @Test
    void theRecordedPrecisionAndRecallOfTheCandidatesOnThePlantedAnswers() {
        val comparison = compare("before", "after");
        assertTrue(comparison.getWarnings().isEmpty(), "no replaces anywhere: " + comparison.getWarnings());
        val found = new TreeSet<String>();
        for (val candidate : comparison.getCandidates()) found.add(key(candidate));
        assertEquals(found.size(), comparison.getCandidates().size(), "a pair is listed once");

        val same = new TreeSet<String>();
        val scenarioOf = new TreeMap<String, String>();
        for (val answer : answers().get("same")) {
            same.add(key(answer));
            scenarioOf.put(key(answer), answer.get("scenario").asText());
        }
        val truePositives = new TreeSet<>(found);
        truePositives.retainAll(same);
        val falsePositives = new TreeSet<>(found);
        falsePositives.removeAll(same);

        val report = new StringBuilder();
        report.append(
            "# Recorded by ReplacesLargePairTest on replaces-large-pair (an invented harbour): before -> after, no replaces anywhere.\n"
        );
        report.append(
            "# Regenerate with: ./mvnw -o test -Dtest=ReplacesLargePairTest -DrecordReplacesLargePair=true\n"
        );
        report.append(
            String.format(
                "planted=%d found=%d true-positives=%d false-positives=%d misses=%d%n",
                same.size(),
                found.size(),
                truePositives.size(),
                falsePositives.size(),
                same.size() - truePositives.size()
            )
        );
        report.append(
            String.format(
                "precision=%.3f recall=%.3f%n",
                truePositives.size() / (double) found.size(),
                truePositives.size() / (double) same.size()
            )
        );

        // by level of the tree: layer and depth of the reference (application/1 persons and systems, /2 containers, /3 components, technology/1 environments, /2 nodes)
        val levels = new TreeMap<String, int[]>();
        for (val k : found) levels.computeIfAbsent(level(k), l -> new int[2])[truePositives.contains(k) ? 0 : 1]++;
        val missesByLevel = new TreeMap<String, Integer>();
        for (val k : same) if (!found.contains(k)) missesByLevel.merge(level(k), 1, Integer::sum);
        levels.forEach((level, counts) ->
            report.append(
                String.format(
                    "level %s: true-positives=%d false-positives=%d misses=%d%n",
                    level,
                    counts[0],
                    counts[1],
                    missesByLevel.getOrDefault(level, 0)
                )
            )
        );

        // the false friends planted on purpose: which ones the rule lists, which it rejects
        val traps = new TreeMap<String, int[]>();
        for (val answer : answers().get("notSame")) {
            traps.computeIfAbsent(answer.get("trap").asText(), t -> new int[2])[found.contains(key(answer)) ? 0 : 1]++;
        }
        traps.forEach((trap, counts) ->
            report.append(String.format("trap %s: listed=%d rejected=%d%n", trap, counts[0], counts[1]))
        );

        // the planted pairs, by scenario: found and missed
        val perScenario = new TreeMap<String, int[]>();
        for (val k : same)
            perScenario.computeIfAbsent(scenarioOf.get(k), s -> new int[2])[truePositives.contains(k) ? 0 : 1]++;
        perScenario.forEach((scenario, counts) ->
            report.append(String.format("scenario %s: found=%d missed=%d%n", scenario, counts[0], counts[1]))
        );

        // a floor under the recorded numbers (0.56 and 0.78 today; 0.45 and 0.78 before a repeated name stopped being a reason, issue #60), so that a
        // change of the rule that makes the candidates clearly worse fails here and is not just a new text to record; the pair is invented, so these
        // are not a promise about a real workspace
        val precision = truePositives.size() / (double) found.size();
        val recall = truePositives.size() / (double) same.size();
        assertTrue(precision > 0.5, "precision of the candidates fell to " + precision);
        assertTrue(recall >= 0.7, "recall of the candidates fell to " + recall);

        assertRecorded("recorded-candidates.txt", report.toString());
    }

    /**
     * The same plateau where the author wrote {@code replaces} for every planted answer: the kernel takes all of them
     * (no warning), lists none of them as a candidate any more, and counts the elements that moved, split and merged.
     */
    @Test
    void whenTheAuthorDeclaresEveryPlantedAnswerTheKernelTakesThemAndListsNoneOfThemAsACandidate() {
        val comparison = compare("before", "after-declared");
        assertTrue(
            comparison.getWarnings().isEmpty(),
            "every replaces points at the base: " + comparison.getWarnings()
        );
        val same = new TreeSet<String>();
        for (val answer : answers().get("same")) same.add(key(answer));
        for (val candidate : comparison.getCandidates()) {
            assertTrue(!same.contains(key(candidate)), "declared, so no longer a candidate: " + key(candidate));
        }
        val elements = comparison.getCounts().elements();
        val report = String.format(
            "# before -> after-declared: moved=%d split=%d merged=%d, candidates left=%d%n",
            elements.moved(),
            elements.split(),
            elements.merged(),
            comparison.getCandidates().size()
        );
        assertRecorded("recorded-declared.txt", report);
    }

    private static String level(String pair) {
        val from = pair.substring(0, pair.indexOf(" -> "));
        val layer = from.substring(0, from.indexOf(':'));
        val reference = from.substring(from.indexOf(':') + 1);
        return layer + "/" + reference.split("\\.").length;
    }

    /**
     * Kernel contract 5 (wave 014, issue #70): {@code before} and {@code after} are on one chain ({@code after} overrides {@code before}),
     * and the pair is compared as such, so the 137 candidates recorded above are what the command line and the editor give. Told as two
     * siblings, the same plateaus lose the reason {@code parent} and nothing else: a pair whose only reason was the parent goes, the others
     * keep their other reasons.
     */
    @Test
    void theSamePairToldAsSiblingsLosesTheParentAndNothingElse() {
        val path = WORKSPACE.toAbsolutePath();
        val before = workspaceFactory.create(path, null, "before");
        val after = workspaceFactory.create(path, null, "after");
        assertTrue(PlateauComparer.onOneChain(before, after), "after overrides before: a chain");
        val comparer = new PlateauComparer(objectMapper);
        val chain = comparer.compare(before, after);
        val siblings = comparer.compare(before, after, false);
        assertEquals(chain.getCandidates().size(), compare("before", "after").getCandidates().size());

        val expected = new TreeMap<String, List<String>>();
        for (val c : chain.getCandidates()) {
            val reasons = c
                .reasons()
                .stream()
                .filter(r -> !"parent".equals(r))
                .toList();
            if (!reasons.isEmpty()) {
                expected.put(key(c), reasons);
            }
        }
        val actual = new TreeMap<String, List<String>>();
        for (val c : siblings.getCandidates()) {
            actual.put(key(c), c.reasons());
        }
        assertEquals(expected, actual);
        val onlyParent = chain.getCandidates().size() - expected.size();
        assertTrue(onlyParent > 0, "the pair has candidates whose only reason is the parent: " + onlyParent);
        assertEquals(
            chain.getCounts().toString(),
            siblings.getCounts().toString(),
            "the comparison itself does not move"
        );
    }

    @SneakyThrows
    private static void assertRecorded(String file, String actual) {
        val recorded = FIXTURE.resolve(file);
        if (Boolean.getBoolean("recordReplacesLargePair")) {
            Files.writeString(recorded, actual);
        }
        assertEquals(
            Files.readString(recorded),
            actual,
            "the recorded numbers of " +
                file +
                " moved: a change to the thresholds or to the rules of the candidates, or to the pair"
        );
    }
}

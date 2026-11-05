package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.workspace.Impact.Direction;
import io.morin.archicode.workspace.Impact.Edge;
import io.morin.archicode.workspace.Impact.Reached;
import io.morin.archicode.workspace.Impact.Request;
import io.morin.archicode.workspace.Impact.Result;
import java.util.List;
import java.util.Set;
import lombok.val;
import org.junit.jupiter.api.Test;

/**
 * The walk of {@code query impact}: {@link Impact} is called with hand-made references and edges, without a command line,
 * a workspace or Quarkus. Each case is a rule of the walk: containment, the shortest distance, the first edge as {@code
 * via}, the direction, the depth, the qualifiers and the couplings that are followed.
 */
class ImpactTest {

    private static Edge rel(String source, String destination, String... qualifiers) {
        return new Edge(source, destination, List.of(qualifiers), null, false);
    }

    private static Edge deployment(String node, String application) {
        return new Edge(node, application, List.of(), null, true);
    }

    private static Request request(String start, Direction direction, Integer depth) {
        return new Request(start, direction, depth, List.of(), List.of());
    }

    private static Set<String> refs(String... references) {
        return Set.of(references);
    }

    private static List<String> references(Result result) {
        return result.reached().stream().map(Reached::reference).toList();
    }

    private static List<Integer> distances(Result result) {
        return result.reached().stream().map(Reached::distance).toList();
    }

    @Test
    void shouldFollowAChainTowardsTheDependents() {
        val edges = List.of(rel("b", "a"), rel("c", "b"), rel("d", "c"));
        val result = Impact.walk(refs("a", "b", "c", "d"), edges, request("a", Direction.IN, null));
        assertEquals(List.of("b", "c", "d"), references(result));
        assertEquals(List.of(1, 2, 3), distances(result));
        assertEquals("a", result.start());
        assertEquals(Direction.IN, result.direction());
        assertNull(result.depth());
    }

    @Test
    void shouldFollowAChainTowardsTheDependencies() {
        val edges = List.of(rel("a", "b"), rel("b", "c"));
        val result = Impact.walk(refs("a", "b", "c"), edges, request("a", Direction.OUT, null));
        assertEquals(List.of("b", "c"), references(result));
        assertEquals(List.of(1, 2), distances(result));
    }

    @Test
    void shouldFollowBothDirections() {
        val edges = List.of(rel("a", "b"), rel("c", "a"));
        val result = Impact.walk(refs("a", "b", "c"), edges, request("a", Direction.BOTH, null));
        assertEquals(List.of("b", "c"), references(result));
        assertEquals(List.of(1, 1), distances(result));
    }

    @Test
    void shouldEndOnACycle() {
        val edges = List.of(rel("a", "b"), rel("b", "c"), rel("c", "a"));
        val result = Impact.walk(refs("a", "b", "c"), edges, request("a", Direction.OUT, null));
        assertEquals(List.of("b", "c"), references(result));
    }

    @Test
    void shouldReachAnElementOnceAtItsShortestDistance() {
        val edges = List.of(rel("a", "b"), rel("b", "d"), rel("a", "c"), rel("c", "d"), rel("a", "d"));
        val result = Impact.walk(refs("a", "b", "c", "d"), edges, request("a", Direction.OUT, null));
        assertEquals(List.of("b", "c", "d"), references(result));
        assertEquals(List.of(1, 1, 1), distances(result));
    }

    @Test
    void shouldPickTheShortestDistanceOfADiamond() {
        val edges = List.of(rel("a", "b"), rel("b", "c"), rel("c", "d"), rel("a", "d"));
        val result = Impact.walk(refs("a", "b", "c", "d"), edges, request("a", Direction.OUT, null));
        assertEquals(List.of("b", "d", "c"), references(result));
        assertEquals(List.of(1, 1, 2), distances(result));
    }

    @Test
    void shouldRecordTheFirstEdgeThatReachedAnElementAsVia() {
        val first = new Edge("x", "a", List.of("calls"), "first", false);
        val second = new Edge("x", "a", List.of("uses"), "second", false);
        val result = Impact.walk(refs("a", "x"), List.of(first, second), request("a", Direction.IN, null));
        assertEquals(1, result.reached().size());
        assertEquals(first, result.reached().get(0).via());
    }

    @Test
    void shouldReachAnAncestorOfAnElementReachedInTheSameHop() {
        val edges = List.of(rel("a.b", "s"), rel("a", "s"));
        val result = Impact.walk(refs("s", "a", "a.b"), edges, request("s", Direction.IN, null));
        assertEquals(List.of("a", "a.b"), references(result));
        assertEquals(List.of(1, 1), distances(result));
        assertEquals("a", result.reached().get(0).via().source());
    }

    @Test
    void shouldReachAnAncestorInALaterHop() {
        val edges = List.of(rel("a.b", "s"), rel("a", "a.b"));
        val result = Impact.walk(refs("s", "a", "a.b"), edges, request("s", Direction.IN, null));
        assertEquals(List.of("a.b", "a"), references(result));
        assertEquals(List.of(1, 2), distances(result));
    }

    @Test
    void shouldDropADescendantOfAVisitedElement() {
        val edges = List.of(rel("a", "s"), rel("a.b", "s"));
        val result = Impact.walk(refs("s", "a", "a.b"), edges, request("s", Direction.IN, null));
        assertEquals(List.of("a"), references(result));
        assertEquals("a", result.reached().get(0).via().source());
    }

    @Test
    void shouldLeaveOutTheDescendantsOfTheStart() {
        val edges = List.of(rel("s.child", "x"), rel("y", "s.child"), rel("s", "z"));
        val result = Impact.walk(refs("s", "s.child", "x", "y", "z"), edges, request("s", Direction.BOTH, null));
        assertEquals(List.of("x", "y", "z"), references(result));
    }

    @Test
    void shouldLetTheFrontierCoverTheDescendantsOfItsElements() {
        val edges = List.of(rel("m", "a"), rel("n", "a.b.c"));
        val result = Impact.walk(refs("a", "a.b", "a.b.c", "m", "n"), edges, request("a", Direction.IN, null));
        assertEquals(List.of("m", "n"), references(result));
        val deeper = List.of(rel("a", "t"), rel("t", "u"), rel("v", "a.b"));
        val out = Impact.walk(refs("a", "a.b", "t", "u", "v"), deeper, request("a", Direction.OUT, null));
        assertEquals(List.of("t", "u"), references(out));
    }

    @Test
    void shouldStartAtANestedElement() {
        val edges = List.of(rel("x", "a.b"), rel("y", "a"));
        val result = Impact.walk(refs("a", "a.b", "x", "y"), edges, request("a.b", Direction.IN, null));
        assertEquals(List.of("x"), references(result));
    }

    @Test
    void shouldAnswerNothingForAStartWithNoEdge() {
        val result = Impact.walk(refs("a", "b"), List.of(rel("a", "b")), request("b", Direction.OUT, null));
        assertTrue(result.reached().isEmpty());
    }

    @Test
    void shouldStopAtTheDepth() {
        val edges = List.of(rel("b", "a"), rel("c", "b"), rel("d", "c"));
        val one = Impact.walk(refs("a", "b", "c", "d"), edges, request("a", Direction.IN, 1));
        assertEquals(List.of("b"), references(one));
        assertEquals(1, one.depth());
        val two = Impact.walk(refs("a", "b", "c", "d"), edges, request("a", Direction.IN, 2));
        assertEquals(List.of("b", "c"), references(two));
        val unbounded = Impact.walk(refs("a", "b", "c", "d"), edges, request("a", Direction.IN, null));
        assertEquals(List.of("b", "c", "d"), references(unbounded));
    }

    @Test
    void shouldFollowARelationshipThatCarriesAnyOfTheQualifiers() {
        val edges = List.of(rel("b", "a", "calls"), rel("c", "a", "uses"), rel("d", "a", "owns"), rel("e", "a"));
        val request = new Request("a", Direction.IN, null, List.of("calls", "uses"), List.of());
        val result = Impact.walk(refs("a", "b", "c", "d", "e"), edges, request);
        assertEquals(List.of("b", "c"), references(result));
    }

    @Test
    void shouldFollowEveryRelationshipWithoutQualifier() {
        val edges = List.of(rel("b", "a", "calls"), rel("c", "a"));
        val result = Impact.walk(refs("a", "b", "c"), edges, request("a", Direction.IN, null));
        assertEquals(List.of("b", "c"), references(result));
    }

    @Test
    void shouldFollowARelationshipWhenThroughNamesRelationships() {
        val edges = List.of(rel("b", "a"), deployment("n", "a"));
        val request = new Request("a", Direction.IN, null, List.of(), List.of("relationships"));
        assertEquals(List.of("b"), references(Impact.walk(refs("a", "b", "n"), edges, request)));
    }

    @Test
    void shouldFollowADeploymentFromTheNodeToTheApplication() {
        val edges = List.of(deployment("node", "app"));
        val request = new Request("node", Direction.OUT, null, List.of(), List.of("deployments"));
        val result = Impact.walk(refs("node", "app"), edges, request);
        assertEquals(List.of("app"), references(result));
        assertTrue(result.reached().get(0).via().deployment());
    }

    @Test
    void shouldFollowADeploymentFromTheApplicationToTheNode() {
        val edges = List.of(deployment("node", "app"));
        val request = new Request("app", Direction.IN, null, List.of(), List.of("deployments"));
        assertEquals(List.of("node"), references(Impact.walk(refs("node", "app"), edges, request)));
    }

    @Test
    void shouldIgnoreRelationshipsWhenThroughHoldsOnlyDeployments() {
        val edges = List.of(rel("b", "a"), deployment("n", "a"));
        val request = new Request("a", Direction.IN, null, List.of(), List.of("deployments"));
        assertEquals(List.of("n"), references(Impact.walk(refs("a", "b", "n"), edges, request)));
    }

    @Test
    void shouldIgnoreTheQualifiersWhenThroughHoldsOnlyDeployments() {
        val edges = List.of(rel("b", "a", "calls"), deployment("n", "a"));
        val request = new Request("a", Direction.IN, null, List.of("calls"), List.of("deployments"));
        assertEquals(List.of("n"), references(Impact.walk(refs("a", "b", "n"), edges, request)));
    }

    @Test
    void shouldFilterRelationshipsAndFollowDeploymentsWhenThroughHoldsBoth() {
        val edges = List.of(rel("b", "a", "calls"), rel("c", "a", "uses"), deployment("n", "a"));
        val request = new Request("a", Direction.IN, null, List.of("calls"), List.of("relationships", "deployments"));
        assertEquals(List.of("b", "n"), references(Impact.walk(refs("a", "b", "c", "n"), edges, request)));
    }

    @Test
    void shouldReachAHostedApplicationAsWrittenWhenItIsDangling() {
        val edges = List.of(deployment("node", "ghost"));
        val request = new Request("node", Direction.OUT, null, List.of(), List.of("deployments"));
        assertEquals(List.of("ghost"), references(Impact.walk(refs("node"), edges, request)));
    }

    @Test
    void shouldSortByDistanceThenByReference() {
        val edges = List.of(rel("z", "a"), rel("m", "a"), rel("b", "z"), rel("c", "m"));
        val result = Impact.walk(refs("a", "z", "m", "b", "c"), edges, request("a", Direction.IN, null));
        assertEquals(List.of("m", "z", "b", "c"), references(result));
        assertEquals(List.of(1, 1, 2, 2), distances(result));
    }

    @Test
    void shouldRefuseAnUnknownStart() {
        val e = assertThrows(ArchiCodeException.class, () ->
            Impact.walk(refs("a"), List.of(), request("nowhere", Direction.IN, null))
        );
        assertEquals(
            "the element `nowhere` does not exist: `archicode query graph` lists the references",
            e.getMessage()
        );
    }

    @Test
    void shouldRefuseADepthOfZeroOrLess() {
        for (val depth : List.of(0, -1)) {
            val e = assertThrows(ArchiCodeException.class, () -> Impact.requireDepth(depth));
            assertEquals("the depth must be 1 or more: `" + depth + "`", e.getMessage());
        }
        Impact.requireDepth(null);
        Impact.requireDepth(1);
    }

    @Test
    void shouldCheckTheDepthWhenWalking() {
        val e = assertThrows(ArchiCodeException.class, () ->
            Impact.walk(refs("a"), List.of(), request("a", Direction.IN, 0))
        );
        assertEquals("the depth must be 1 or more: `0`", e.getMessage());
    }
}

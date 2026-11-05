package io.morin.archicode.workspace;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.morin.archicode.ArchiCodeException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.val;

/**
 * What a change to an element touches: the walk of {@code archicode query impact}. It is pure: it is given the references
 * of the elements and the edges between them, and returns a {@link Result} or throws an {@link ArchiCodeException} whose
 * message is the sentence of a refusal. It reads no file, knows no command line and writes nothing.
 * <p>
 * The walk is breadth first, hop by hop. An element covers itself and its descendants (the reference equals it or starts
 * with it and a dot): the frontier covers the descendants of its elements, and a reference is dropped when a visited one
 * covers it, so an element is reached once, at the first hop that reaches it, which is its shortest distance. Within a hop
 * the edges are read in their order, so the first edge that reaches a reference is its {@code via}. The start and its
 * descendants are never answered. The answer is sorted by distance, then by reference.
 */
public final class Impact {

    /** The couplings that are followed when the request names none. */
    private static final String RELATIONSHIPS = "relationships";

    private static final String DEPLOYMENTS = "deployments";

    private Impact() {}

    /** Which way the edges are followed. */
    public enum Direction {
        /** The elements that point at the start: the source of the edges that end at the frontier. */
        IN,
        /** The elements the start points at: the destination of the edges that start at the frontier. */
        OUT,
        /** Both. */
        BOTH
    }

    /**
     * A coupling between two elements.
     *
     * @param source      the reference of the element the coupling starts at (the node of a deployment)
     * @param destination the reference of the element it ends at (the application of a deployment)
     * @param qualifiers  the qualifiers of a relationship, empty for a deployment
     * @param label       the label of a relationship, or null
     * @param deployment  whether the edge is a deployment of an application on a node
     */
    public record Edge(
        String source,
        String destination,
        List<String> qualifiers,
        String label,
        @JsonInclude(JsonInclude.Include.NON_DEFAULT) boolean deployment
    ) {}

    /**
     * What is asked.
     *
     * @param start      the reference of the element a change is made to
     * @param direction  which way the edges are followed
     * @param depth      the number of hops at most, or null for no bound
     * @param qualifiers the qualifiers of which a relationship carries one to be followed; none means every relationship
     * @param through    the couplings followed, {@code relationships} and {@code deployments}; none means relationships
     */
    public record Request(
        String start,
        Direction direction,
        Integer depth,
        List<String> qualifiers,
        List<String> through
    ) {}

    /**
     * An element the change touches.
     *
     * @param reference the reference of the element
     * @param distance  the number of the hop that reached it
     * @param via       the first edge that reached it
     */
    public record Reached(String reference, int distance, Edge via) {}

    /**
     * The answer.
     *
     * @param start     the reference asked for
     * @param direction the direction followed
     * @param depth     the depth asked for, or null
     * @param reached   the elements touched, sorted by distance then reference
     */
    public record Result(
        String start,
        Direction direction,
        @JsonInclude(JsonInclude.Include.ALWAYS) Integer depth,
        @JsonInclude(JsonInclude.Include.ALWAYS) List<Reached> reached
    ) {}

    /**
     * Refuse a depth that is 0 or less; a null depth (no bound) passes.
     *
     * @param depth the depth asked for, or null
     */
    public static void requireDepth(Integer depth) {
        if (depth != null && depth < 1) {
            throw new ArchiCodeException("the depth must be 1 or more: `%d`", depth);
        }
    }

    /**
     * Walk from the start of the request.
     *
     * @param references every reference of the graph, nested elements included
     * @param edges      the couplings, in the order a tie between two of them is settled by
     * @param request    what is asked
     * @return the elements touched
     * @throws ArchiCodeException when the depth is 0 or less, or the start is not a reference of the graph
     */
    public static Result walk(Set<String> references, List<Edge> edges, Request request) {
        requireDepth(request.depth());
        if (!references.contains(request.start())) {
            throw new ArchiCodeException(
                "the element `%s` does not exist: `archicode query graph` lists the references",
                request.start()
            );
        }
        val followed = followed(edges, request);
        val in = request.direction() != Direction.OUT;
        val out = request.direction() != Direction.IN;
        val visited = new HashSet<String>();
        visited.add(request.start());
        val reached = new ArrayList<Reached>();
        var frontier = new ArrayDeque<String>();
        frontier.add(request.start());
        var hop = 0;
        while (!frontier.isEmpty() && (request.depth() == null || hop < request.depth())) {
            hop++;
            val next = new ArrayDeque<String>();
            val covering = new HashSet<>(frontier);
            for (val edge : followed) {
                if (out && coveredByAny(covering, edge.source())) {
                    reach(edge.destination(), edge, hop, visited, reached, next);
                }
                if (in && coveredByAny(covering, edge.destination())) {
                    reach(edge.source(), edge, hop, visited, reached, next);
                }
            }
            frontier = next;
        }
        reached.sort(Comparator.comparingInt(Reached::distance).thenComparing(Reached::reference));
        return new Result(request.start(), request.direction(), request.depth(), List.copyOf(reached));
    }

    private static List<Edge> followed(List<Edge> edges, Request request) {
        val through =
            request.through() == null || request.through().isEmpty() ? List.of(RELATIONSHIPS) : request.through();
        val relationships = through.contains(RELATIONSHIPS);
        val deployments = through.contains(DEPLOYMENTS);
        val result = new ArrayList<Edge>();
        for (val edge : edges) {
            if (edge.deployment() ? deployments : relationships && carriesOne(edge, request.qualifiers())) {
                result.add(edge);
            }
        }
        return result;
    }

    private static boolean carriesOne(Edge edge, List<String> qualifiers) {
        return qualifiers == null || qualifiers.isEmpty() || edge.qualifiers().stream().anyMatch(qualifiers::contains);
    }

    private static void reach(
        String reference,
        Edge via,
        int hop,
        Set<String> visited,
        List<Reached> reached,
        Deque<String> next
    ) {
        if (coveredByAny(visited, reference)) {
            return;
        }
        visited.add(reference);
        next.add(reference);
        reached.add(new Reached(reference, hop, via));
    }

    private static boolean covers(String ancestor, String reference) {
        return reference.equals(ancestor) || reference.startsWith(ancestor + ".");
    }

    private static boolean coveredByAny(Set<String> ancestors, String reference) {
        return ancestors.stream().anyMatch(a -> covers(a, reference));
    }
}

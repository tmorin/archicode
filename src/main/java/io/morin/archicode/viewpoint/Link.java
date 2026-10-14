package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.element.application.Relationship;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.*;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
public class Link implements Comparable<Link> {

    @NonNull
    @ToString.Include
    Item from;

    @NonNull
    @ToString.Include
    Item to;

    String label;

    @Builder.Default
    boolean synthetic = false;

    @Builder.Default
    Set<String> qualifiers = new LinkedHashSet<>();

    @Builder.Default
    Map<String, String> tags = new LinkedHashMap<>();

    @NonNull
    @Singular
    Set<Relationship> relationships;

    private static final String SEPARATOR = "\0";

    /**
     * The first criterion is the order the views have always been written in. The others only settle what it leaves
     * tied: two links between the items of one application deployed on several nodes have the same references and the
     * same label, and a tie is left to the order of the {@code Set} the links come from, which depends on the identity
     * hash of the JVM. They end on what the link says, so that two links that differ in any way are never tied.
     */
    private static final Comparator<Link> ORDER = Comparator.<Link, String>comparing(
        link -> link.from.getReference() + link.to.getReference() + link.label
    )
        .thenComparing(link -> link.from.getItemId())
        .thenComparing(link -> link.to.getItemId())
        .thenComparing(Link::isSynthetic)
        .thenComparing(link -> String.join(SEPARATOR, link.qualifiers))
        .thenComparing(link -> String.valueOf(link.tags))
        .thenComparing(link -> link.relationships.stream().map(Link::describe).collect(Collectors.joining(SEPARATOR)));

    private static String describe(Relationship relationship) {
        return String.join(
            SEPARATOR,
            relationship.getDestination(),
            String.valueOf(relationship.getLabel()),
            String.valueOf(relationship.getQualifiers()),
            String.valueOf(relationship.getTags())
        );
    }

    @Override
    public int compareTo(Link o) {
        return ORDER.compare(this, o);
    }
}

package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.element.application.Relationship;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
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

    @Override
    public int compareTo(Link o) {
        return (this.from.getReference() + this.to.getReference() + this.label).compareTo(
                o.from.getReference() + o.to.getReference() + o.label
            );
    }
}

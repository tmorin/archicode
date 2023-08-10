package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.element.application.Relationship;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
@Jacksonized
public class Link {

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
}

package io.morin.archicode.resource.element.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
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
public class Relationship {

    @ToString.Include
    @NonNull
    @JsonProperty(required = true)
    String destination;

    String label;

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> qualifiers;

    @Singular
    @JsonDeserialize(as = LinkedHashMap.class)
    Map<String, String> tags;
}

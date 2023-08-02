package io.morin.archcode.model;

import java.util.HashSet;
import java.util.Set;
import lombok.Builder;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class Relationship {

    @ToString.Include
    String destination;

    String label;

    @Builder.Default
    Set<String> qualifiers = new HashSet<>();
}

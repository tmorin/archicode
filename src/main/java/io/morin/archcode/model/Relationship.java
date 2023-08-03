package io.morin.archcode.model;

import java.util.Set;
import lombok.Builder;
import lombok.Singular;
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

    @Singular
    Set<String> qualifiers;
}

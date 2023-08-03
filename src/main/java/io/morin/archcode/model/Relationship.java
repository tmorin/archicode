package io.morin.archcode.model;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.LinkedHashSet;
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
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> qualifiers;
}

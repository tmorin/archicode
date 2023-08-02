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
public class Model implements Parent<ModelElement> {

    @ToString.Include
    String name;

    String description;

    @Singular
    Set<ModelElement> elements;
}

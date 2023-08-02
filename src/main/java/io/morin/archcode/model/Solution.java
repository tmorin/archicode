package io.morin.archcode.model;

import java.util.Set;
import lombok.Singular;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder
@Jacksonized
public class Solution extends AbstractElement implements Parent<SolutionElement>, ModelElement {

    @Singular
    Set<SolutionElement> elements;
}

package io.morin.archcode.model;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.LinkedHashSet;
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
public class SolutionGroup extends AbstractElement implements Parent<SolutionElement>, SolutionElement {

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<SolutionElement> elements;
}

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
public class Container extends AbstractElement implements Parent<ContainerElement>, SystemElement {

    String technology;

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<ContainerElement> elements;
}

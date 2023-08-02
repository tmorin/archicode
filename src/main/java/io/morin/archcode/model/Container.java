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
public class Container extends AbstractElement implements TechnologyElement, Parent<ContainerElement>, SystemElement {

    String technology;

    @Singular
    Set<ContainerElement> elements;
}

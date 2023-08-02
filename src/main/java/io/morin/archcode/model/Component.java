package io.morin.archcode.model;

import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder
@Jacksonized
public class Component extends AbstractElement implements TechnologyElement, ContainerElement {

    String technology;
}

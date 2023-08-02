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
public class SystemGroup extends AbstractElement implements Parent<SystemElement>, SystemElement {

    @Singular
    Set<SystemElement> elements;
}

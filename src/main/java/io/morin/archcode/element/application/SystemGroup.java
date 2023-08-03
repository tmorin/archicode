package io.morin.archcode.element.application;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archcode.element.AbstractElement;
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
public class SystemGroup extends AbstractElement implements Parent<SystemElement>, SystemElement {

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<SystemElement> elements;
}

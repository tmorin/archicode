package io.morin.archicode.element.application;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.element.AbstractElement;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Builder;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder
@Jacksonized
public class SystemGroup extends AbstractElement implements Parent<SystemElement>, SystemElement {

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<SystemElement> elements = new LinkedHashSet<>();
}

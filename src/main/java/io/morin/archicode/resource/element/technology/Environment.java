package io.morin.archicode.resource.element.technology;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.resource.element.AbstractElement;
import io.morin.archicode.resource.element.application.Parent;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Builder;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder(toBuilder = true)
@Jacksonized
public class Environment extends AbstractElement implements Parent<EnvironmentElement>, TechnologyElement {

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<EnvironmentElement> elements = new LinkedHashSet<>();
}

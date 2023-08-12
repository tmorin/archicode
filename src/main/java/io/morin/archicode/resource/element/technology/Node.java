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
public class Node extends AbstractElement implements Parent<NodeElement>, EnvironmentElement, NodeElement {

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> applications = new LinkedHashSet<>();

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<NodeElement> elements = new LinkedHashSet<>();
}

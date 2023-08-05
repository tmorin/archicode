package io.morin.archicode.element.deployment;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.element.AbstractElement;
import io.morin.archicode.element.application.Parent;
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
public class Node extends AbstractElement implements Parent<NodeElement>, EnvironmentElement, NodeElement {

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<NodeElement> elements;
}
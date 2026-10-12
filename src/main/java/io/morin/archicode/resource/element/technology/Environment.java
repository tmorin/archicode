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

    /**
     * The references of the environments, or of the nodes of other environments, that this environment uses.
     * <p>
     * It is not a relationship, it draws nothing by itself. When an application deployed in this environment has a
     * relationship towards an application that the environment does not host, the application is looked for in what
     * the environment uses, and a dependency between the two deployed applications is derived.
     */
    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> uses = new LinkedHashSet<>();
}

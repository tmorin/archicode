package io.morin.archicode.resource.element.deployment;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.resource.element.application.Parent;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Builder;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
@Jacksonized
public class Deployment implements Parent<DeploymentElement> {

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<DeploymentElement> elements = new LinkedHashSet<>();
}

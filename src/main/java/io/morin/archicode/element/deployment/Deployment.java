package io.morin.archicode.element.deployment;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.element.application.Parent;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Builder;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class Deployment implements Parent<DeploymentElement> {

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<DeploymentElement> elements = new LinkedHashSet<>();
}

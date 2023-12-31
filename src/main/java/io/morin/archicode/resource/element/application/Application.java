package io.morin.archicode.resource.element.application;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
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
public class Application implements Parent<ApplicationElement> {

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<ApplicationElement> elements = new LinkedHashSet<>();
}

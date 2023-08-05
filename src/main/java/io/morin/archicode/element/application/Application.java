package io.morin.archicode.element.application;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Builder;
import lombok.Singular;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class Application implements Parent<ApplicationElement> {

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<ApplicationElement> elements;
}

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
public class ApplicationGroup extends AbstractElement implements Parent<ApplicationElement>, ApplicationElement {

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<ApplicationElement> elements;
}

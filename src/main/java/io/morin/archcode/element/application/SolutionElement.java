package io.morin.archcode.element.application;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.morin.archcode.element.Element;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = System.class, name = "system"),
        @JsonSubTypes.Type(value = SolutionGroup.class, name = "group")
    }
)
public interface SolutionElement extends Element {}

package io.morin.archicode.element.application;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.morin.archicode.element.Element;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = System.class, name = "system"),
        @JsonSubTypes.Type(value = SolutionGroup.class, name = "group")
    }
)
public interface SolutionElement extends Element {}

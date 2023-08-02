package io.morin.archcode.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = System.class, name = "system"),
        @JsonSubTypes.Type(value = SolutionGroup.class, name = "group")
    }
)
public interface SolutionElement extends Element {}

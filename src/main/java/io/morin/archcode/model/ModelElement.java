package io.morin.archcode.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = System.class, name = "system"),
        @JsonSubTypes.Type(value = ModelGroup.class, name = "group"),
        @JsonSubTypes.Type(value = Solution.class, name = "solution"),
        @JsonSubTypes.Type(value = Person.class, name = "person")
    }
)
public interface ModelElement extends Element {}

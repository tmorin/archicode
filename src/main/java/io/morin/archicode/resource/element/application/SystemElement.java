package io.morin.archicode.resource.element.application;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.morin.archicode.resource.element.Element;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = Container.class, name = "container"),
        @JsonSubTypes.Type(value = SystemGroup.class, name = "group")
    }
)
public interface SystemElement extends Element {}

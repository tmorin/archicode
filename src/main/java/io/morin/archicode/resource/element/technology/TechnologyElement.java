package io.morin.archicode.resource.element.technology;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.morin.archicode.resource.element.Element;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes({ @JsonSubTypes.Type(value = Environment.class, name = "environment") })
public interface TechnologyElement extends Element {}

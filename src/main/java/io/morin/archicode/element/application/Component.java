package io.morin.archicode.element.application;

import io.morin.archicode.element.AbstractElement;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder
@Jacksonized
public class Component extends AbstractElement implements ContainerElement {}

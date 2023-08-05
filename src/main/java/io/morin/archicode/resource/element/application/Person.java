package io.morin.archicode.resource.element.application;

import io.morin.archicode.resource.element.AbstractElement;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder
@Jacksonized
public class Person extends AbstractElement implements ApplicationElement {}

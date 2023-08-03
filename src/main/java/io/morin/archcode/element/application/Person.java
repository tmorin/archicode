package io.morin.archcode.element.application;

import io.morin.archcode.element.AbstractElement;
import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@SuperBuilder
@Jacksonized
public class Person extends AbstractElement implements ApplicationElement {}

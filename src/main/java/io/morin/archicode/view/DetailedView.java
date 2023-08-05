package io.morin.archicode.view;

import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString
@SuperBuilder
@Jacksonized
public class DetailedView extends AbstractView {

    String element;
}

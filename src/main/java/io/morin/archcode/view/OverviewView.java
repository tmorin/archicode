package io.morin.archcode.view;

import lombok.ToString;
import lombok.Value;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString
@SuperBuilder
@Jacksonized
public class OverviewView extends AbstractView {

    String element;
}

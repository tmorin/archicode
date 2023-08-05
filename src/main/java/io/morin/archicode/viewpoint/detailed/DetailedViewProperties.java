package io.morin.archicode.viewpoint.detailed;

import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class DetailedViewProperties {

    @NonNull
    String element;
}

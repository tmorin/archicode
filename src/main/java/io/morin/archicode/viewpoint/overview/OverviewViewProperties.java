package io.morin.archicode.viewpoint.overview;

import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class OverviewViewProperties {

    @NonNull
    String element;
}

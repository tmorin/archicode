package io.morin.archicode.viewpoint.deep;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class DeepViewProperties {

    @NonNull
    String element;

    @Builder.Default
    @JsonProperty("show-application-links")
    boolean showApplicationLinks = true;
}

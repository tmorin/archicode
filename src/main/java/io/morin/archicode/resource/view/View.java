package io.morin.archicode.resource.view;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
public class View {

    @NonNull
    String viewId;

    @NonNull
    String viewpoint;

    String name;

    String description;

    JsonNode properties;
}

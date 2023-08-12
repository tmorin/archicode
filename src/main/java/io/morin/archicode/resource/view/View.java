package io.morin.archicode.resource.view;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
@Jacksonized
public class View {

    @NonNull
    @ToString.Include
    String id;

    @NonNull
    @ToString.Include
    String viewpoint;

    @Builder.Default
    @ToString.Include
    Layer layer = Layer.APPLICATION;

    String name;

    String description;

    JsonNode properties;

    public enum Layer {
        APPLICATION,
        TECHNOLOGY
    }
}

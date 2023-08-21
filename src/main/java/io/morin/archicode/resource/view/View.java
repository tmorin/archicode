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

    /**
     * The identifier of the view.
     * <p>
     * Its format should match the variable name in Java or Javascript.
     */
    @NonNull
    @ToString.Include
    String id;

    /**
     * The code of the viewpoint identifying the viewpoint service.
     */
    @NonNull
    @ToString.Include
    String viewpoint;

    /**
     * The reference data model of the viewpoint.
     */
    @Builder.Default
    @ToString.Include
    Layer layer = Layer.APPLICATION;

    /**
     * The human name of the view.
     */
    String name;

    /**
     * A short description of the element, usually between 25 and 75 words.
     */
    String description;

    /**
     * A custom object containing properties to drive the execution of the viewpoint and/or renderer service.
     */
    @ToString.Include
    JsonNode properties;

    public enum Layer {
        APPLICATION,
        TECHNOLOGY
    }
}

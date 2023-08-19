package io.morin.archicode.resource.element.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
@Jacksonized
public class Relationship {

    /**
     * The reference of the destination element within the same layer.
     */
    @ToString.Include
    @NonNull
    @JsonProperty(required = true)
    String destination;

    /**
     * A human-readable text defining the relationship.
     */
    String label;

    /**
     * A list of specific characteristics that helps define or categorize the relationship.
     * <p>
     * They are usually rendered in views.
     * It can be the name of the protocol implementing the link.
     */
    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> qualifiers;

    /**
     * A list of key/value pairs that helps to drive the rendering of views.
     * <p>
     * For instance, to set TCP ports and IPs driving the rendering of Kubernetes Network Policy manifests.
     */
    @Singular
    @JsonDeserialize(as = LinkedHashMap.class)
    Map<String, String> tags;
}

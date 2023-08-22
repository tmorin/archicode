package io.morin.archicode.resource.workspace;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder(toBuilder = true)
@Jacksonized
public class Settings {

    @Builder.Default
    Manifests manifests = Manifests.builder().build();

    @Builder.Default
    Relationships relationships = Relationships.builder().build();

    @Builder.Default
    Views views = Views.builder().build();

    @Value
    @Builder
    @Jacksonized
    public static class Manifests {

        @Builder.Default
        Set<String> paths = new HashSet<>(Set.of("manifests"));
    }

    @Value
    @Builder
    @Jacksonized
    public static class Relationships {

        @Builder.Default
        @JsonProperty("default-synthetic-label")
        String defaultSyntheticLabel = "uses";
    }

    @Value
    @Builder
    @Jacksonized
    public static class Views {

        /**
         * The default folder for the generated views.
         */
        @Builder.Default
        String path = "views";

        /**
         * The default label.
         */
        @Builder.Default
        Map<String, String> labels = new LinkedHashMap<>();

        /**
         * The default properties.
         */
        @Builder.Default
        Map<String, ObjectNode> properties = new LinkedHashMap<>();
    }
}

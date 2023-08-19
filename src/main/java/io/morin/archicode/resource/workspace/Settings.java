package io.morin.archicode.resource.workspace;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashSet;
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

        @Builder.Default
        Labels labels = Labels.builder().build();

        @Builder.Default
        String path = "views";

        @Value
        @Builder
        @Jacksonized
        public static class Labels {

            @Builder.Default
            String overview = "Overview";

            @Builder.Default
            String detailed = "Detailed View";

            @Builder.Default
            String deep = "Deep View";
        }
    }
}
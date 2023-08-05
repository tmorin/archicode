package io.morin.archicode.workspace;

import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class Settings {

    @Builder.Default
    Relationships relationships = Relationships.builder().build();

    @Value
    @Builder
    @Jacksonized
    public static class Relationships {

        @Builder.Default
        String defaultSyntheticLabel = "uses";
    }
}

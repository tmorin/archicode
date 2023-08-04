package io.morin.archcode.workspace;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class Styles {

    @Value
    @Builder
    @Jacksonized
    public static class Style {

        @JsonProperty("background-color")
        String backgroundColor;

        @JsonProperty("border-color")
        String borderColor;

        @JsonProperty("border-style")
        String borderStyle;

        @JsonProperty("round-corner")
        int roundCorner;

        @JsonProperty("foreground-color")
        String foregroundColor;

        boolean shadowing;
    }

    @Singular
    @JsonDeserialize(as = LinkedHashMap.class)
    @JsonProperty("by-tags")
    Map<String, Style> byTags;
}

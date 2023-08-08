package io.morin.archicode.resource.workspace;

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

    Style atomic;

    @Builder.Default
    Style composite = Style
        .builder()
        .backgroundColor("transparent")
        .lineColor("darkgray")
        .lineStyle(5)
        .fontStyle("normal")
        .build();

    @Singular
    @JsonDeserialize(as = LinkedHashMap.class)
    @JsonProperty("by-qualifiers")
    Map<String, Style> byQualifiers;

    @Singular
    @JsonDeserialize(as = LinkedHashMap.class)
    @JsonProperty("by-tags")
    Map<String, Style> byTags;

    @Value
    @Builder
    @Jacksonized
    public static class Style {

        @JsonProperty("background-color")
        String backgroundColor;

        @JsonProperty("line-color")
        String lineColor;

        @JsonProperty("line-style")
        Integer lineStyle;

        @JsonProperty("line-thickness")
        Integer lineThickness;

        @JsonProperty("round-corner")
        Integer roundCorner;

        @JsonProperty("font-color")
        String fontColor;

        @JsonProperty("font-style")
        String fontStyle;

        boolean shadowing;
    }
}

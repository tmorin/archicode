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
@Builder(toBuilder = true)
@Jacksonized
public class Styles {

    Style atomic;

    @Builder.Default
    Style composite = Style.builder()
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

        /** The length of a dash of the line (PlantUML's {@code LineStyle}); 0 is a solid line. */
        @JsonProperty("line-style")
        Integer lineStyle;

        /**
         * The gap between two dashes. Without it the gap is as long as the dash ({@code line-style: 5} is a dash of 5 and a
         * gap of 5); with it the line is {@code <line-style>-<line-gap>}, so that two lines may have dashes of the same
         * length and be told apart by their gaps. It means nothing without a {@code line-style}.
         */
        @JsonProperty("line-gap")
        Integer lineGap;

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

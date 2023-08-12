package io.morin.archicode.manifest;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder(toBuilder = true)
@Jacksonized
@ToString(onlyExplicitlyIncluded = true)
public class Manifest {

    @NonNull
    @JsonProperty(required = true)
    Manifest.Header header;

    @NonNull
    @JsonProperty(required = true)
    ObjectNode content;

    @JsonIgnore
    public ManifestKind getKind() {
        return header.kind;
    }

    @Value
    @Builder
    @Jacksonized
    @ToString(onlyExplicitlyIncluded = true)
    public static class Header {

        @NonNull
        @JsonProperty(required = true)
        ManifestKind kind;

        @NonNull
        @JsonProperty(required = true)
        String version;

        String parent;
    }
}

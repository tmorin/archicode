package io.morin.archicode.manifest;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.ArchiCodeException;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@ToString(onlyExplicitlyIncluded = true)
public class Resource {

    @NonNull
    Resource.Header header;

    @NonNull
    ObjectNode content;

    @JsonIgnore
    public ResourceKind getKind() {
        return ResourceKind
            .findById(header.getKind())
            .orElseThrow(() -> new ArchiCodeException("unable to find the Resource Kind %s", header.getKind()));
    }

    @Value
    @Builder
    @Jacksonized
    @ToString(onlyExplicitlyIncluded = true)
    public static class Header {

        @NonNull
        String kind;

        @NonNull
        String version;

        String parent;
    }
}

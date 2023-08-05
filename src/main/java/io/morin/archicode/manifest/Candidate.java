package io.morin.archicode.manifest;

import io.morin.archicode.element.Element;
import lombok.Builder;
import lombok.NonNull;
import lombok.ToString;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@ToString(onlyExplicitlyIncluded = true)
public class Candidate {

    String parent;

    @NonNull
    @ToString.Include
    String reference;

    @NonNull
    @ToString.Include
    Element element;
}

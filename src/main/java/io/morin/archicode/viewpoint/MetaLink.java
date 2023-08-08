package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Relationship;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Builder(toBuilder = true)
@ToString(onlyExplicitlyIncluded = true)
@Jacksonized
@Getter
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class MetaLink {

    @NonNull
    @ToString.Include
    String fromReference;

    @NonNull
    Element fromElement;

    @NonNull
    @ToString.Include
    Level fromLevel;

    @NonNull
    @ToString.Include
    String toReference;

    @NonNull
    Element toElement;

    @NonNull
    @ToString.Include
    Level toLevel;

    @NonNull
    Relationship relationship;
}

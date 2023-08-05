package io.morin.archicode.context.overview;

import io.morin.archicode.context.Level;
import io.morin.archicode.element.Element;
import io.morin.archicode.element.application.Relationship;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Builder
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

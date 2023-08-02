package io.morin.archcode.context.overview;

import io.morin.archcode.context.Level;
import io.morin.archcode.model.Element;
import io.morin.archcode.model.Relationship;
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

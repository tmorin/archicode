package io.morin.archcode.context;

import io.morin.archcode.model.Relationship;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Jacksonized
@Getter
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Link {

    @NonNull
    @Builder.Default
    @EqualsAndHashCode.Include
    String linkId = String.format("link_%s", UUID.randomUUID().toString().replace("-", ""));

    @NonNull
    @ToString.Include
    Item from;

    @NonNull
    @ToString.Include
    Item to;

    String label;

    @Builder.Default
    boolean synthetic = false;

    @Builder.Default
    Set<String> qualifiers = new LinkedHashSet<>();

    @NonNull
    @Singular
    Set<Relationship> relationships;
}

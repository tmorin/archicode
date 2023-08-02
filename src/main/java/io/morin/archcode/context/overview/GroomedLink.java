package io.morin.archcode.context.overview;

import io.morin.archcode.context.Level;
import io.morin.archcode.model.Element;
import io.morin.archcode.model.Relationship;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Jacksonized
@Getter
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class GroomedLink {

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
    @Builder.Default
    @EqualsAndHashCode.Include
    Map<RelationshipKind, Set<Relationship>> relationships = new EnumMap<>(RelationshipKind.class);

    public enum RelationshipKind {
        NATURAL,
        SYNTHETIC
    }
}

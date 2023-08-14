package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Relationship;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Value
@Builder(toBuilder = true)
@ToString(onlyExplicitlyIncluded = true)
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class GroomedLink {

    @NonNull
    @ToString.Include
    Direction direction;

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
    Map<RelationshipKind, Set<Relationship>> relationships = new EnumMap<>(RelationshipKind.class);

    public enum RelationshipKind {
        NATURAL,
        SYNTHETIC
    }

    public enum Direction {
        INGRESS,
        EGRESS
    }
}

package io.morin.archicode.resource.element;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.morin.archicode.resource.element.application.Relationship;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Getter
@EqualsAndHashCode
@SuperBuilder(toBuilder = true)
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public abstract class AbstractElement implements Element {

    @NonNull
    @JsonProperty(required = true)
    String id;

    String name;
    String description;

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> qualifiers = new LinkedHashSet<>();

    @Builder.Default
    @JsonDeserialize(as = LinkedHashMap.class)
    Map<String, String> tags = new LinkedHashMap<>();

    @Builder.Default
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<Relationship> relationships = new LinkedHashSet<>();

    @Override
    public String toString() {
        return "id='" + id + '\'';
    }
}

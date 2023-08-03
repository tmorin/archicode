package io.morin.archcode.model;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Getter
@EqualsAndHashCode
@SuperBuilder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public abstract class AbstractElement implements Element {

    @NonNull
    String id;

    String name;
    String description;

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<String> qualifiers;

    @Singular
    @JsonDeserialize(as = LinkedHashMap.class)
    Map<String, String> tags;

    @Singular
    @JsonDeserialize(as = LinkedHashSet.class)
    Set<Relationship> relationships;

    @Override
    public String toString() {
        return "id='" + id + '\'';
    }
}

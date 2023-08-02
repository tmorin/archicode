package io.morin.archcode.model;

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
    String qualifier;

    @Singular
    Set<Relationship> relationships;

    @Override
    public String toString() {
        return "id='" + id + '\'';
    }
}

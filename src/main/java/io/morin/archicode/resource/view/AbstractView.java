package io.morin.archicode.resource.view;

import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Getter
@ToString
@EqualsAndHashCode
@SuperBuilder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public abstract class AbstractView implements ViewResource {

    @NonNull
    String viewId;

    String name;
    String description;
}

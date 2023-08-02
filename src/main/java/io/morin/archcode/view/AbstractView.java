package io.morin.archcode.view;

import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Getter
@ToString
@EqualsAndHashCode
@SuperBuilder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public abstract class AbstractView implements View {

    @NonNull
    String viewId;

    String name;
    String description;
}

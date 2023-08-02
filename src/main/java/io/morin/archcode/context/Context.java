package io.morin.archcode.context;

import io.morin.archcode.view.View;
import io.morin.archcode.workspace.Workspace;
import java.util.Set;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;

@Builder
@Jacksonized
@Getter
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Context {

    @NonNull
    Workspace workspace;

    @NonNull
    View view;

    @Singular
    Set<Item> items;

    @Singular
    Set<Link> links;
}

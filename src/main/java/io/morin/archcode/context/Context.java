package io.morin.archcode.context;

import io.morin.archcode.view.View;
import io.morin.archcode.workspace.Workspace;
import java.util.Set;
import lombok.*;
import lombok.extern.jackson.Jacksonized;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder
@Jacksonized
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

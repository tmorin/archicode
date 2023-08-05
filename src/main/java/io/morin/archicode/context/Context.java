package io.morin.archicode.context;

import io.morin.archicode.view.View;
import io.morin.archicode.workspace.Workspace;
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

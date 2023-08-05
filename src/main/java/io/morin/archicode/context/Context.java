package io.morin.archicode.context;

import io.morin.archicode.resource.view.ViewResource;
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
    ViewResource view;

    @Singular
    Set<Item> items;

    @Singular
    Set<Link> links;
}

package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.view.View;
import io.morin.archicode.workspace.Workspace;
import java.util.Set;
import lombok.*;

@Value
@ToString(onlyExplicitlyIncluded = true)
@Builder(toBuilder = true)
public class Viewpoint {

    @NonNull
    Workspace workspace;

    @NonNull
    View view;

    @Singular
    Set<Item> items;

    @Singular
    Set<Link> links;
}

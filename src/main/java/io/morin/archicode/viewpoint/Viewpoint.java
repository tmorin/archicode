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

    /**
     * True for the view of a comparison of two plateaus: every item and link then says what changed ({@link Item#getChange()},
     * {@link Link#getChange()}, even when it is nothing), and a renderer draws the changes. False for a view that
     * compares nothing, which is drawn as it always was.
     */
    @Builder.Default
    boolean compared = false;
}

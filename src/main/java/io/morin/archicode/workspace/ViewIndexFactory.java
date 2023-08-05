package io.morin.archicode.workspace;

import io.morin.archicode.resource.view.View;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class ViewIndexFactory {

    @NonNull
    ViewIndex index = ViewIndex.builder().build();

    @NonNull
    Set<View> views;

    public ViewIndex create() {
        views.forEach(view -> index.viewByViewIdIndex.put(view.getViewId(), view));
        return index;
    }
}

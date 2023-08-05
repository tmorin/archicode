package io.morin.archicode.workspace;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.resource.view.ViewResource;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PUBLIC)
public class ViewIndex {

    @NonNull
    @Builder.Default
    Map<String, ViewResource> viewByViewIdIndex = new HashMap<>();

    public Optional<ViewResource> searchView(String viewId) {
        return Optional.ofNullable(viewByViewIdIndex.get(viewId));
    }

    public ViewResource getView(String viewId) {
        return searchView(viewId).orElseThrow(() -> new ArchiCodeException("unable to find the view %s", viewId));
    }
}

package io.morin.archicode.workspace;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.morin.archicode.resource.view.View;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.experimental.Delegate;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder(toBuilder = true)
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Workspace {

    @JsonIgnore
    @Builder.Default
    public ElementIndex appIndex = ElementIndex.builder().build();

    @JsonIgnore
    @Builder.Default
    public ElementIndex techIndex = ElementIndex.builder().build();

    @JsonIgnore
    @Builder.Default
    public ViewIndex viewIndex = ViewIndex.builder().build();

    @Delegate
    io.morin.archicode.resource.workspace.Workspace resources;

    public ElementIndex resolveMainIndexForView(View view) {
        if (view.getLayer().equals(View.Layer.APPLICATION)) {
            return appIndex;
        }
        return techIndex;
    }
}

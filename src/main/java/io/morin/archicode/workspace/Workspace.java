package io.morin.archicode.workspace;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.experimental.Delegate;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class Workspace {

    @Builder.Default
    public ElementIndex appIndex = ElementIndex.builder().build();

    @Builder.Default
    public ViewIndex viewIndex = ViewIndex.builder().build();

    @Delegate
    io.morin.archicode.resource.workspace.Workspace resources;
}

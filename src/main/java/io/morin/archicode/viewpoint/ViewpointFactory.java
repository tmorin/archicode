package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.view.View;
import io.morin.archicode.workspace.Workspace;
import lombok.NonNull;

public interface ViewpointFactory {
    Viewpoint create(@NonNull Workspace workspace, @NonNull View view);
}

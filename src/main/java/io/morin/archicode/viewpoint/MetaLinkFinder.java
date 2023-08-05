package io.morin.archicode.viewpoint;

import io.morin.archicode.workspace.Workspace;
import java.util.Set;
import lombok.NonNull;

public interface MetaLinkFinder {
    Set<MetaLink> find(@NonNull Workspace workspace, @NonNull String fromReference);
}

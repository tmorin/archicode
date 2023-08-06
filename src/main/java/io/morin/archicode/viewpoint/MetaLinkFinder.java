package io.morin.archicode.viewpoint;

import io.morin.archicode.workspace.ElementIndex;
import java.util.Set;
import lombok.NonNull;

public interface MetaLinkFinder {
    Set<MetaLink> find(@NonNull ElementIndex index, @NonNull String fromReference);
}

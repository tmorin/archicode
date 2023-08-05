package io.morin.archicode.viewpoint;

import io.morin.archicode.workspace.Workspace;
import java.util.Set;

public interface MetaLinkFinder {
    Set<MetaLink> find(Workspace workspace, String fromReference);
}

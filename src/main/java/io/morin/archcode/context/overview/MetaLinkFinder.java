package io.morin.archcode.context.overview;

import io.morin.archcode.workspace.Workspace;
import java.util.Set;

public interface MetaLinkFinder {
    Set<MetaLink> find(Workspace workspace, String fromReference);
}

package io.morin.archicode.resource.element;

import io.morin.archicode.resource.element.application.Relationship;
import java.util.Map;
import java.util.Set;

public interface Element {
    String getId();

    String getName();

    String getDescription();

    Set<String> getQualifiers();

    Map<String, String> getTags();

    Set<Relationship> getRelationships();

    /**
     * The references of the elements of an earlier plateau that this element replaces (it moved, or was renamed, split
     * or merged). Empty for most elements.
     */
    Set<String> getReplaces();
}

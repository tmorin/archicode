package io.morin.archcode.model;

import java.util.Set;

public interface Element {
    String getId();

    String getName();

    String getDescription();

    String getQualifier();

    Set<Relationship> getRelationships();
}

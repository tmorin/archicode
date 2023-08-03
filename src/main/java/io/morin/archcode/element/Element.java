package io.morin.archcode.element;

import io.morin.archcode.element.application.Relationship;
import java.util.Map;
import java.util.Set;

public interface Element {
    String getId();

    String getName();

    String getDescription();

    Set<String> getQualifiers();

    Map<String, String> getTags();

    Set<Relationship> getRelationships();
}

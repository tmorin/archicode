package io.morin.archicode.resource.view;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = DetailedView.class, name = "detailed"),
        @JsonSubTypes.Type(value = OverviewView.class, name = "overview"),
        @JsonSubTypes.Type(value = OverviewView.class, name = "overview")
    }
)
public interface ViewResource {
    String getViewId();

    String getName();

    String getDescription();
}

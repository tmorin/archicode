package io.morin.archicode.view;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes(
    {
        @JsonSubTypes.Type(value = DetailedView.class, name = "detailed"),
        @JsonSubTypes.Type(value = OverviewView.class, name = "overview")
    }
)
public interface View {
    String getViewId();

    String getName();

    String getDescription();
}

package io.morin.archicode.viewpoint;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import java.util.Optional;
import lombok.NonNull;

public interface ViewpointService {
    String getName();

    ViewpointFactory createViewpointFactory();

    default Optional<View.ViewBuilder> createViewBuilder(
        @NonNull String reference,
        @NonNull Element element,
        @NonNull Settings.Views views
    ) {
        return Optional.empty();
    }

    default void setMapperFactory(@NonNull MapperFactory mapperFactory) {}
}

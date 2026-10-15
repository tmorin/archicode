package io.morin.archicode.viewpoint;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.kernel.Comparison;
import java.util.Optional;
import lombok.NonNull;

public interface ViewpointService {
    String getName();

    ViewpointFactory createViewpointFactory();

    /**
     * The factory of the views of a comparison of two plateaus.
     *
     * @param comparison  what changed between the two plateaus, or null for the views of one workspace
     * @param onlyChanges keep only what changed, with the context it needs
     * @return the factory; for a viewpoint that knows no comparison, the one of {@link #createViewpointFactory()}
     */
    default ViewpointFactory createViewpointFactory(Comparison comparison, boolean onlyChanges) {
        return createViewpointFactory();
    }

    default Optional<View.ViewBuilder> createViewBuilder(
        @NonNull String reference,
        @NonNull Element element,
        @NonNull Settings.Views views,
        ObjectNode properties
    ) {
        return Optional.empty();
    }

    default void setMapperFactory(@NonNull MapperFactory mapperFactory) {}
}

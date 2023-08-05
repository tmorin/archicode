package io.morin.archicode.viewpoint;

import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.deep.DeepViewpointFactory;
import io.morin.archicode.viewpoint.detailed.DetailedViewpointFactory;
import io.morin.archicode.viewpoint.overview.OverviewViewpointFactory;
import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class ViewpointFactory {

    DetailedViewpointFactory detailedViewpointFactory;
    OverviewViewpointFactory overviewViewpointFactory;
    DeepViewpointFactory deepViewpointFactory;

    @SneakyThrows
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        switch (view.getViewpoint()) {
            case "overview" -> {
                return overviewViewpointFactory.create(workspace, view);
            }
            case "detailed" -> {
                return detailedViewpointFactory.create(workspace, view);
            }
            case "deep" -> {
                return deepViewpointFactory.create(workspace, view);
            }
            default -> throw new IllegalStateException("Unexpected value: " + view);
        }
    }
}

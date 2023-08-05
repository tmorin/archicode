package io.morin.archicode.context;

import io.morin.archicode.context.deep.DeepContextFactory;
import io.morin.archicode.context.detailed.DetailedContextFactory;
import io.morin.archicode.context.overview.OverviewContextFactory;
import io.morin.archicode.resource.view.DeepView;
import io.morin.archicode.resource.view.DetailedView;
import io.morin.archicode.resource.view.OverviewView;
import io.morin.archicode.resource.view.ViewResource;
import io.morin.archicode.workspace.Workspace;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class ContextFactory {

    DetailedContextFactory detailedContextFactory;
    OverviewContextFactory overviewContextFactory;
    DeepContextFactory deepContextFactory;

    public Context create(Workspace workspace, ViewResource view) {
        if (view instanceof DetailedView detailedView) {
            return detailedContextFactory.create(workspace, detailedView);
        } else if (view instanceof OverviewView overviewView) {
            return overviewContextFactory.create(workspace, overviewView);
        } else if (view instanceof DeepView deepView) {
            return deepContextFactory.create(workspace, deepView);
        }
        throw new IllegalStateException("Unexpected value: " + view);
    }
}

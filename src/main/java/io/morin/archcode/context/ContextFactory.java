package io.morin.archcode.context;

import io.morin.archcode.context.detailed.DetailedContextFactory;
import io.morin.archcode.context.overview.OverviewContextFactory;
import io.morin.archcode.view.DetailedView;
import io.morin.archcode.view.OverviewView;
import io.morin.archcode.view.View;
import io.morin.archcode.workspace.Workspace;
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

    public Context create(Workspace workspace, View view) {
        if (view instanceof DetailedView detailedView) {
            return detailedContextFactory.create(workspace, detailedView);
        } else if (view instanceof OverviewView overviewView) {
            return overviewContextFactory.create(workspace, overviewView);
        }
        throw new IllegalStateException("Unexpected value: " + view);
    }
}

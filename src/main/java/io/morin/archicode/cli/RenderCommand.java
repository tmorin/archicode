package io.morin.archicode.cli;

import io.morin.archicode.context.ContextFactory;
import io.morin.archicode.context.Item;
import io.morin.archicode.element.application.Parent;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.view.DetailedView;
import io.morin.archicode.view.OverviewView;
import io.morin.archicode.view.View;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(name = "render")
public class RenderCommand {

    @CommandLine.ParentCommand
    ArchiCodeCommand archiCodeCommand;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ContextFactory contextFactory;

    @CommandLine.Option(
        names = { "-e", "--renderer" },
        paramLabel = "renderer",
        defaultValue = "plantuml",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The name of the renderer."
    )
    String rendererName;

    @CommandLine.Option(
        names = { "-o", "--output" },
        paramLabel = "path",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The output directory."
    )
    Path viewsDirPath;

    @SneakyThrows
    @CommandLine.Command(name = "views", description = "Render views")
    void renderViews(
        @CommandLine.Parameters(description = "The view identifiers to render.") @NonNull Set<String> viewIds
    ) {
        val workspace = workspaceFactory.create(archiCodeCommand.workspaceFilePath);

        val outputDirPath = Path.of(
            archiCodeCommand.workspaceFilePath.toFile().getParent(),
            Optional.ofNullable(viewsDirPath).orElse(Path.of(workspace.getSettings().getViews().getPath())).toString()
        );

        for (String viewId : viewIds) {
            log.info("render {}", viewId);
            val view = workspace.viewIndex.getView(viewId);
            val context = contextFactory.create(workspace, view);
            renderer.render(context, rendererName, outputDirPath);
        }

        workspace.appIndex
            .listAllElementReferences(element -> element instanceof Parent<?>)
            .stream()
            .flatMap(reference -> {
                val element = workspace.appIndex.getElementByReference(reference);

                val views = new HashSet<View>();
                val overviewElementView = OverviewView
                    .builder()
                    .element(reference)
                    .viewId(String.format("%s_%s", reference.replace("/", "_"), "overview"))
                    .description(
                        String.format(
                            "%s - %s - %s",
                            Item.Kind.from(element).getLabel(),
                            element.getName(),
                            workspace.getSettings().getViews().getLabels().getOverview()
                        )
                    )
                    .build();
                views.add(overviewElementView);

                if (element instanceof Parent<?> parentElement && (!parentElement.getElements().isEmpty())) {
                    val detailedElementView = DetailedView
                        .builder()
                        .element(reference)
                        .viewId(String.format("%s_%s", reference.replace("/", "_"), "detailed"))
                        .description(
                            String.format(
                                "%s - %s - %s",
                                Item.Kind.from(element).getLabel(),
                                element.getName(),
                                workspace.getSettings().getViews().getLabels().getDetailed()
                            )
                        )
                        .build();
                    views.add(detailedElementView);
                }

                return views.stream();
            })
            .forEach(view -> {
                log.info("render {}", view.getViewId());
                val context = contextFactory.create(workspace, view);
                renderer.render(context, rendererName, outputDirPath);
            });
    }
}

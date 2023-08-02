package io.morin.archcode.cli;

import io.morin.archcode.context.ContextFactory;
import io.morin.archcode.model.Parent;
import io.morin.archcode.rendering.Renderer;
import io.morin.archcode.rendering.RendererEngine;
import io.morin.archcode.view.DetailedView;
import io.morin.archcode.view.OverviewView;
import io.morin.archcode.view.View;
import io.morin.archcode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@CommandLine.Command(name = "render")
@Slf4j
public class RenderCommand {

    @CommandLine.ParentCommand
    ArchcodeCommand archcodeCommand;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ContextFactory contextFactory;

    @CommandLine.Option(names = { "-e", "--rendererEngine" }, description = "The rendered rendererEngine.")
    RendererEngine rendererEngine;

    @CommandLine.Option(names = { "-o", "--output" }, defaultValue = "views", description = "The output directory.")
    Path viewsDirPath;

    @CommandLine.Command(name = "views", description = "Render views")
    @SneakyThrows
    void renderViews(@CommandLine.Parameters(description = "The view identifiers to render.") Set<String> viewIds) {
        val workspace = workspaceFactory.create(archcodeCommand.workspaceFilePath);
        val outputDirPath = Path.of(archcodeCommand.workspaceFilePath.toFile().getParent(), viewsDirPath.toString());
        for (String viewId : viewIds) {
            log.info("render {}", viewId);
            val view = workspace.getView(viewId);
            val context = contextFactory.create(workspace, view);
            renderer.render(context, rendererEngine, outputDirPath);
        }
    }

    @CommandLine.Command(name = "perspectives", description = "Render perspectives")
    @SneakyThrows
    void renderPerspectives() {
        val workspace = workspaceFactory.create(archcodeCommand.workspaceFilePath);
        val outputDirPath = Path.of(archcodeCommand.workspaceFilePath.toFile().getParent(), viewsDirPath.toString());
        workspace
            .listAllElementReferences(element -> element instanceof Parent<?>)
            .stream()
            .flatMap(reference -> {
                val views = new HashSet<View>();

                val overviewElementView = OverviewView
                    .builder()
                    .element(reference)
                    .viewId(String.format("%s_%s", reference.replace("/", "_"), "overview"))
                    .build();
                views.add(overviewElementView);

                val element = workspace.getElementByReference(reference);
                if (element instanceof Parent<?> parentElement && (!parentElement.getElements().isEmpty())) {
                    val detailedElementView = DetailedView
                        .builder()
                        .element(reference)
                        .viewId(String.format("%s_%s", reference.replace("/", "_"), "detailed"))
                        .build();
                    views.add(detailedElementView);
                }

                return views.stream();
            })
            .forEach(view -> {
                log.info("render {}", view.getViewId());
                val context = contextFactory.create(workspace, view);
                renderer.render(context, rendererEngine, outputDirPath);
            });
    }
}

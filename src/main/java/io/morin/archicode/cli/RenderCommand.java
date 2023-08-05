package io.morin.archicode.cli;

import io.morin.archicode.context.ContextFactory;
import io.morin.archicode.element.application.Parent;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.rendering.RendererEngine;
import io.morin.archicode.view.DetailedView;
import io.morin.archicode.view.OverviewView;
import io.morin.archicode.view.View;
import io.morin.archicode.workspace.WorkspaceFactory;
import jakarta.inject.Inject;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import picocli.CommandLine;

@Slf4j
@CommandLine.Command(name = "render")
public class RenderCommand {

    @RequiredArgsConstructor
    static class RendererEngineConvert implements CommandLine.ITypeConverter<RendererEngine> {

        @Override
        public RendererEngine convert(String value) {
            return RendererEngine.valueOf(value.toUpperCase());
        }
    }

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
        description = "The rendered engine.",
        converter = RendererEngineConvert.class
    )
    RendererEngine rendererEngine;

    @CommandLine.Option(
        names = { "-o", "--output" },
        paramLabel = "path",
        defaultValue = "./views",
        showDefaultValue = CommandLine.Help.Visibility.ALWAYS,
        description = "The output directory."
    )
    Path viewsDirPath;

    @SneakyThrows
    @CommandLine.Command(name = "views", description = "Render views")
    void renderViews(@CommandLine.Parameters(description = "The view identifiers to render.") Set<String> viewIds) {
        val workspace = workspaceFactory.create(archiCodeCommand.workspaceFilePath);
        val outputDirPath = Path.of(archiCodeCommand.workspaceFilePath.toFile().getParent(), viewsDirPath.toString());
        for (String viewId : viewIds) {
            log.info("render {}", viewId);
            val view = workspace.getView(viewId);
            val context = contextFactory.create(workspace, view);
            renderer.render(context, rendererEngine, outputDirPath);
        }
    }

    @SneakyThrows
    @CommandLine.Command(name = "perspectives", description = "Render perspectives")
    void renderPerspectives() {
        val workspace = workspaceFactory.create(archiCodeCommand.workspaceFilePath);
        val outputDirPath = Path.of(
            archiCodeCommand.workspaceFilePath.toFile().getAbsoluteFile().getParent(),
            viewsDirPath.toString()
        );
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

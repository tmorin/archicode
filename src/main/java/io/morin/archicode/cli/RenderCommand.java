package io.morin.archicode.cli;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.rendering.Renderer;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.ViewpointFactory;
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

    static ObjectMapper objectMapper = new ObjectMapper();

    @CommandLine.ParentCommand
    ArchiCodeCommand archiCodeCommand;

    @Inject
    WorkspaceFactory workspaceFactory;

    @Inject
    Renderer renderer;

    @Inject
    ViewpointFactory viewpointFactory;

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
            val context = viewpointFactory.create(workspace, view);
            renderer.render(context, rendererName, outputDirPath);
        }

        workspace.appIndex
            .listAllElementReferences(element -> element instanceof Parent<?>)
            .stream()
            .flatMap(reference -> {
                val element = workspace.appIndex.getElementByReference(reference);

                val views = new HashSet<View>();
                val overviewElementView = View
                    .builder()
                    .viewpoint("overview")
                    .viewId(String.format("%s_%s", reference.replace("/", "_"), "overview"))
                    .description(
                        String.format(
                            "%s - %s - %s",
                            Item.Kind.from(element).getLabel(),
                            element.getName(),
                            workspace.getSettings().getViews().getLabels().getOverview()
                        )
                    )
                    .properties(objectMapper.createObjectNode().put("element", reference))
                    .build();
                views.add(overviewElementView);

                val deepView = View
                    .builder()
                    .viewpoint("deep")
                    .viewId(String.format("%s_%s", reference.replace("/", "_"), "deep"))
                    .description(
                        String.format(
                            "%s - %s - %s",
                            Item.Kind.from(element).getLabel(),
                            element.getName(),
                            workspace.getSettings().getViews().getLabels().getDeep()
                        )
                    )
                    .properties(objectMapper.createObjectNode().put("element", reference))
                    .build();
                views.add(deepView);

                if (element instanceof Parent<?> parentElement && (!parentElement.getElements().isEmpty())) {
                    val detailedElementView = View
                        .builder()
                        .viewpoint("detailed")
                        .viewId(String.format("%s_%s", reference.replace("/", "_"), "detailed"))
                        .description(
                            String.format(
                                "%s - %s - %s",
                                Item.Kind.from(element).getLabel(),
                                element.getName(),
                                workspace.getSettings().getViews().getLabels().getDetailed()
                            )
                        )
                        .properties(objectMapper.createObjectNode().put("element", reference))
                        .build();
                    views.add(detailedElementView);
                }

                return views.stream();
            })
            .forEach(view -> {
                log.info("render {}", view.getViewId());
                val context = viewpointFactory.create(workspace, view);
                renderer.render(context, rendererName, outputDirPath);
            });
    }
}

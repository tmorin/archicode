package io.morin.archicode.viewpoint.deep;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.viewpoint.MetaLinkFinderForEgress;
import io.morin.archicode.viewpoint.MetaLinkFinderForIngress;
import io.morin.archicode.viewpoint.Viewpoint;
import io.morin.archicode.viewpoint.ViewpointFactory;
import io.morin.archicode.workspace.Workspace;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Builder
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class DeepViewpointFactory implements ViewpointFactory {

    @NonNull
    MetaLinkFinderForEgress metaLinkFinderForEgress;

    @NonNull
    MetaLinkFinderForIngress metaLinkFinderForIngress;

    @NonNull
    ObjectMapper objectMapper;

    @SneakyThrows
    @Override
    public Viewpoint create(@NonNull Workspace workspace, @NonNull View view) {
        log.debug("create viewpoint for {}", view);
        if (view.getLayer() == View.Layer.APPLICATION) {
            return ApplicationDeepViewpointFactory
                .builder()
                .metaLinkFinderForEgress(metaLinkFinderForEgress)
                .metaLinkFinderForIngress(metaLinkFinderForIngress)
                .objectMapper(objectMapper)
                .build()
                .create(workspace, view);
        } else if (view.getLayer() == View.Layer.TECHNOLOGY) {
            return TechnologyDeepViewpointFactory
                .builder()
                .metaLinkFinderForEgress(metaLinkFinderForEgress)
                .metaLinkFinderForIngress(metaLinkFinderForIngress)
                .objectMapper(objectMapper)
                .build()
                .create(workspace, view);
        } else {
            throw new IllegalArgumentException("Unsupported layer: " + view.getLayer());
        }
    }
}

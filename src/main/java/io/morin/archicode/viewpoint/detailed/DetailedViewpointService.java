package io.morin.archicode.viewpoint.detailed;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.*;
import io.morin.archicode.viewpoint.overview.OverviewViewpointFactory;
import java.util.Optional;
import lombok.NonNull;
import lombok.val;

public class DetailedViewpointService implements ViewpointService {

    private static final MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();
    private static final MetaLinkFinderForIngress metaLinkFinderForIngress = MetaLinkFinderForIngress.builder().build();
    private static final MetaLinkGroomer metaLinkGroomer = MetaLinkGroomer.builder().build();
    private static final String NAME = "detailed";

    MapperFactory mapperFactory;

    @Override
    public void setMapperFactory(@NonNull MapperFactory mapperFactory) {
        this.mapperFactory = mapperFactory;
    }

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public Optional<View.ViewBuilder> createViewBuilder(
        @NonNull String reference,
        @NonNull Element element,
        @NonNull Settings.Views views,
        ObjectNode properties
    ) {
        val om = mapperFactory.create(MapperFormat.JSON);
        return Optional
            .of(element)
            .filter(v -> {
                if (v instanceof Parent<?> parent) {
                    return !parent.getElements().isEmpty();
                }
                return false;
            })
            .map(parent ->
                View
                    .builder()
                    .viewpoint(NAME)
                    .id(String.format("%s_%s", reference.replace("/", "_"), NAME))
                    .description(
                        String.format(
                            "%s - %s - %s",
                            Item.Kind.from(parent).getLabel(),
                            Optional.ofNullable(element.getName()).orElse(element.getId()),
                            views.getLabels().getDetailed()
                        )
                    )
                    .properties(
                        mapperFactory
                            .create(MapperFormat.JSON)
                            .createObjectNode()
                            .put("element", reference)
                            .setAll(Optional.ofNullable(properties).orElseGet(om::createObjectNode))
                    )
            );
    }

    @Override
    public ViewpointFactory createViewpointFactory() {
        return DetailedViewpointFactory
            .builder()
            .objectMapper(mapperFactory.createLazy(MapperFormat.JSON))
            .overviewViewpointFactory(
                OverviewViewpointFactory
                    .builder()
                    .objectMapper(mapperFactory.create(MapperFormat.JSON))
                    .metaLinkFinderForEgress(metaLinkFinderForEgress)
                    .metaLinkFinderForIngress(metaLinkFinderForIngress)
                    .metaLinkGroomer(metaLinkGroomer)
                    .build()
            )
            .build();
    }
}
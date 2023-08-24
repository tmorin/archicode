package io.morin.archicode.viewpoint.overview;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Settings;
import io.morin.archicode.viewpoint.*;
import java.util.Optional;
import lombok.NonNull;
import lombok.val;

public class OverviewViewpointService implements ViewpointService {

    private static final MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();
    private static final MetaLinkFinderForIngress metaLinkFinderForIngress = MetaLinkFinderForIngress.builder().build();
    private static final MetaLinkGroomer metaLinkGroomer = MetaLinkGroomer.builder().build();
    private static final String NAME = "overview";

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

        val newProperties = om.createObjectNode().put("element", reference);
        newProperties.put("element", reference);
        newProperties.setAll(views.getProperties().getOrDefault(NAME, om.createObjectNode()));
        newProperties.setAll(Optional.ofNullable(properties).orElseGet(om::createObjectNode));

        return Optional.of(
            View
                .builder()
                .viewpoint(NAME)
                .id(String.format("%s-%s", reference.replace("/", "_"), NAME))
                .description(
                    String.format(
                        "%s - %s - %s",
                        Item.Kind.from(element).getLabel(),
                        Optional.ofNullable(element.getName()).orElse(element.getId()),
                        views.getLabels().getOrDefault(NAME, "Overview")
                    )
                )
                .properties(newProperties)
        );
    }

    @Override
    public ViewpointFactory createViewpointFactory() {
        return OverviewViewpointFactory
            .builder()
            .objectMapper(mapperFactory.createLazy(MapperFormat.JSON))
            .metaLinkFinderForEgress(metaLinkFinderForEgress)
            .metaLinkFinderForIngress(metaLinkFinderForIngress)
            .metaLinkGroomer(metaLinkGroomer)
            .build();
    }
}

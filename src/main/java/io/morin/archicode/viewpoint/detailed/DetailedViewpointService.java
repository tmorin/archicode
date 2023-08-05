package io.morin.archicode.viewpoint.detailed;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.viewpoint.*;
import io.morin.archicode.viewpoint.overview.OverviewViewpointFactory;

public class DetailedViewpointService implements ViewpointService {

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();
    private static final MetaLinkFinderForIngress metaLinkFinderForIngress = MetaLinkFinderForIngress.builder().build();
    private static final MetaLinkGroomer metaLinkGroomer = MetaLinkGroomer.builder().build();
    private static final String NAME = "detailed";

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public ViewpointFactory createViewpointFactory() {
        return DetailedViewpointFactory
            .builder()
            .objectMapper(objectMapper)
            .overviewViewpointFactory(
                OverviewViewpointFactory
                    .builder()
                    .objectMapper(objectMapper)
                    .metaLinkFinderForEgress(metaLinkFinderForEgress)
                    .metaLinkFinderForIngress(metaLinkFinderForIngress)
                    .metaLinkGroomer(metaLinkGroomer)
                    .build()
            )
            .build();
    }
}

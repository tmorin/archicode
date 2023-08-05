package io.morin.archicode.viewpoint.overview;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.viewpoint.*;

public class OverviewViewpointService implements ViewpointService {

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();
    private static final MetaLinkFinderForIngress metaLinkFinderForIngress = MetaLinkFinderForIngress.builder().build();
    private static final MetaLinkGroomer metaLinkGroomer = MetaLinkGroomer.builder().build();
    private static final String NAME = "overview";

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public ViewpointFactory createViewpointFactory() {
        return OverviewViewpointFactory
            .builder()
            .objectMapper(objectMapper)
            .metaLinkFinderForEgress(metaLinkFinderForEgress)
            .metaLinkFinderForIngress(metaLinkFinderForIngress)
            .metaLinkGroomer(metaLinkGroomer)
            .build();
    }
}

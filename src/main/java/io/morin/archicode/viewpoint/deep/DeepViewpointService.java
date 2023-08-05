package io.morin.archicode.viewpoint.deep;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.viewpoint.MetaLinkFinderForEgress;
import io.morin.archicode.viewpoint.MetaLinkFinderForIngress;
import io.morin.archicode.viewpoint.ViewpointFactory;
import io.morin.archicode.viewpoint.ViewpointService;

public class DeepViewpointService implements ViewpointService {

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final MetaLinkFinderForEgress metaLinkFinderForEgress = MetaLinkFinderForEgress.builder().build();
    private static final MetaLinkFinderForIngress metaLinkFinderForIngress = MetaLinkFinderForIngress.builder().build();
    private static final String NAME = "deep";

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public ViewpointFactory createViewpointFactory() {
        return DeepViewpointFactory
            .builder()
            .objectMapper(objectMapper)
            .metaLinkFinderForEgress(metaLinkFinderForEgress)
            .metaLinkFinderForIngress(metaLinkFinderForIngress)
            .build();
    }
}

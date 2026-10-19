package io.morin.archicode.viewpoint.map;

import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.viewpoint.ViewpointFactory;
import io.morin.archicode.viewpoint.ViewpointService;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.viewpoint.kernel.KernelViewpointFactory;
import lombok.NonNull;

/**
 * The map of a layer: no focal element, every element of the layer folded, with the elements it is pinned on, the ones it
 * leaves out and the boxes that are open ({@code pinned}, {@code hidden} and {@code opened} in the properties of the view).
 * The layer is the view's own, application or technology. It is a view the author names: the command line draws no map
 * of its own accord, which is why this service builds no view for an element.
 */
public class MapViewpointService implements ViewpointService {

    private static final String NAME = KernelViewpointFactory.MAP;

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
    public ViewpointFactory createViewpointFactory() {
        return new KernelViewpointFactory(NAME, mapperFactory.createLazy(MapperFormat.JSON));
    }

    @Override
    public ViewpointFactory createViewpointFactory(Comparison comparison, boolean onlyChanges) {
        return new KernelViewpointFactory(NAME, mapperFactory.createLazy(MapperFormat.JSON), comparison, onlyChanges);
    }
}

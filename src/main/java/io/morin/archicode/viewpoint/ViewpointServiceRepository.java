package io.morin.archicode.viewpoint;

import io.morin.archicode.MapperFactory;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ServiceLoader;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class ViewpointServiceRepository {

    MapperFactory mapperFactory;

    public ViewpointService get(@NonNull String name) {
        val definitions = ServiceLoader.load(ViewpointService.class);
        for (val definition : definitions) {
            if (definition.getName().equals(name)) {
                definition.setMapperFactory(mapperFactory);
                return definition;
            }
        }
        throw new IllegalStateException("Unexpected value: " + name);
    }

    public Set<ViewpointService> getAll() {
        return ServiceLoader
            .load(ViewpointService.class)
            .stream()
            .map(provider -> {
                val service = provider.get();
                service.setMapperFactory(mapperFactory);
                return service;
            })
            .collect(Collectors.toSet());
    }
}

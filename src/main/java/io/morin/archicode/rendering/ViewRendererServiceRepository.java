package io.morin.archicode.rendering;

import io.morin.archicode.MapperFactory;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ServiceLoader;
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
public class ViewRendererServiceRepository {

    MapperFactory mapperFactory;

    public ViewRendererService get(@NonNull String name) {
        val definitions = ServiceLoader.load(ViewRendererService.class);
        for (val definition : definitions) {
            if (definition.getName().equals(name)) {
                definition.setMapperFactory(mapperFactory);
                return definition;
            }
        }
        throw new IllegalStateException("Unexpected value: " + name);
    }
}

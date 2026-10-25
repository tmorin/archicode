package io.morin.archicode.rendering;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ServiceLoader;
import java.util.TreeSet;
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
        val known = new TreeSet<String>();
        for (val definition : ServiceLoader.load(ViewRendererService.class)) {
            if (definition.getName().equals(name)) {
                definition.setMapperFactory(mapperFactory);
                return definition;
            }
            known.add(definition.getName());
        }
        throw new ArchiCodeException("unknown rendering engine `%s` (known: %s)", name, String.join(", ", known));
    }
}

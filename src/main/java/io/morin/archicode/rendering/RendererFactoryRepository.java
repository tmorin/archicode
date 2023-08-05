package io.morin.archicode.rendering;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.ServiceLoader;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class RendererFactoryRepository {

    public RendererFactory getRenderFactory(String engine) {
        val rendererRegisters = ServiceLoader.load(RendererFactory.class);
        for (RendererFactory rendererFactory : rendererRegisters) {
            if (rendererFactory.getName().equals(engine)) {
                return rendererFactory;
            }
        }
        throw new IllegalStateException("Unexpected value: " + engine);
    }
}

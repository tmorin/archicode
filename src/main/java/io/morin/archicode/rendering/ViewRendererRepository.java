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
public class ViewRendererRepository {

    public RendererDefinition getRenderFactory(String engine) {
        val rendererRegisters = ServiceLoader.load(RendererDefinition.class);
        for (RendererDefinition rendererDefinition : rendererRegisters) {
            if (rendererDefinition.getName().equals(engine)) {
                return rendererDefinition;
            }
        }
        throw new IllegalStateException("Unexpected value: " + engine);
    }
}

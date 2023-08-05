package io.morin.archicode.rendering;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
@Slf4j
public class RendererFactory {

    PlantumlEngineRenderer plantumlRenderer;

    public EngineRenderer create(RendererEngine engine) {
        if (Objects.requireNonNull(engine) == RendererEngine.PLANTUML) {
            return plantumlRenderer;
        }
        throw new IllegalStateException("Unexpected value: " + engine);
    }
}

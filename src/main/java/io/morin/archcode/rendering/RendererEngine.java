package io.morin.archcode.rendering;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Getter
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public enum RendererEngine {
    PLANTUML("plantuml", "puml");

    String folder;
    String extension;
}

package io.morin.archicode.manifest;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

@Value
@Builder
@Slf4j
public class ManifestConverter {

    @NonNull
    ObjectMapper mapper;

    @NonNull
    Manifest manifest;

    @SneakyThrows
    @SuppressWarnings("unchecked")
    public <T> T convert() {
        val contentWithKind = manifest.getContent().deepCopy();
        contentWithKind.put("kind", manifest.getKind().getSubTypeName());

        val contentWithKindAsString = contentWithKind.toString();
        log.debug("convert {}", contentWithKindAsString);
        return (T) mapper.readValue(contentWithKindAsString, manifest.getKind().getType());
    }
}

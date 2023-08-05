package io.morin.archicode.manifest;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

@Value
@Builder
@Slf4j
public class ResourceConverter {

    @NonNull
    ObjectMapper mapper;

    @NonNull
    Resource resource;

    @SneakyThrows
    @SuppressWarnings("unchecked")
    public <T> T convert() {
        val contentWithKind = resource.getContent().deepCopy();
        contentWithKind.put("kind", resource.getKind().getSubTypeName());

        val contentWithKindAsString = contentWithKind.toString();
        log.info("convert {}", contentWithKindAsString);
        return (T) mapper.readValue(contentWithKindAsString, resource.getKind().getType());
    }
}

package io.morin.archicode.manifest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

@Value
@Builder
@Slf4j
public class ManifestConverter {

    /** Reads JSON text: the content is turned into JSON text whatever the format of the file it comes from (YAML, JSON or TOML). */
    @NonNull
    ObjectMapper mapper;

    @NonNull
    Manifest manifest;

    /**
     * @param <T> the type of the element, the view or the story the manifest holds
     * @return what the content of the manifest is
     * @throws JsonProcessingException when the content is not that kind of element, view or story
     */
    @SuppressWarnings("unchecked")
    public <T> T convert() throws JsonProcessingException {
        val contentWithKind = manifest.getContent().deepCopy();
        contentWithKind.put("kind", manifest.getKind().getSubTypeName());

        val contentWithKindAsString = contentWithKind.toString();
        log.debug("convert {}", contentWithKindAsString);
        return (T) mapper.readValue(contentWithKindAsString, manifest.getKind().getType());
    }
}

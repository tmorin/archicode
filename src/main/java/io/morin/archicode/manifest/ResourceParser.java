package io.morin.archicode.manifest;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.element.Element;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.File;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class ResourceParser {

    MapperFactory mapperFactory;

    @SneakyThrows
    public Map<Class<?>, Set<Candidate>> parse(Path path) {
        // leave early of the manifests folder doesn't exist
        val directory = path.toFile();
        if (!directory.exists()) {
            return Collections.emptyMap();
        }

        val map = new HashMap<Class<?>, Set<Candidate>>();

        val manifestFilesAsArray = Optional
            .ofNullable(directory.listFiles((dir, name) -> ResourceFormat.resolve(name).isPresent()))
            .orElseThrow(() -> new ArchiCodeException("unable to read the path %s", path));

        for (Path manifestFile : Arrays.stream(manifestFilesAsArray).map(File::toPath).collect(Collectors.toSet())) {
            log.info("parse the manifest {}", manifestFile);

            val mapper = mapperFactory.create(manifestFile);
            val resource = mapper.readValue(manifestFile.toFile(), Resource.class);
            val item = ResourceConverter.builder().resource(resource).mapper(mapper).build().convert();

            if (item instanceof Element element) {
                val reference = Optional
                    .ofNullable(resource.getHeader().getParent())
                    .map(parentReference -> String.format("%s.%s", parentReference, element.getId()))
                    .orElse(element.getId());
                val candidate = Candidate
                    .builder()
                    .parent(resource.getHeader().getParent())
                    .reference(reference)
                    .element(element)
                    .build();
                map.putIfAbsent(resource.getKind().getCategory(), new HashSet<>());
                map.get(resource.getKind().getCategory()).add(candidate);
            }
        }

        return map;
    }
}

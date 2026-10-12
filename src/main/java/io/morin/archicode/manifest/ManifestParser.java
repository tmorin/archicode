package io.morin.archicode.manifest;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.MapperFormat;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.story.Story;
import io.morin.archicode.resource.view.View;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.File;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.jackson.Jacksonized;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@ApplicationScoped
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class ManifestParser {

    MapperFactory mapperFactory;

    /**
     * Read the manifests: the elements, by category, and the views and the stories that are manifests of their own.
     */
    @SneakyThrows
    public Parsed parse(Path wksDir, Set<String> manifestsDirs) {
        val map = new HashMap<Class<?>, Set<Candidate>>();
        val views = new LinkedHashSet<View>();
        val stories = new LinkedHashSet<Story>();

        val paths = manifestsDirs
            .stream()
            .map(wksDir::resolve)
            .filter(path -> path.toFile().exists())
            .collect(Collectors.toSet());

        for (Path path : paths) {
            val directory = path.toFile();

            val manifestFilesAsArray = Optional.ofNullable(
                directory.listFiles((dir, name) -> MapperFormat.resolve(name).isPresent())
            ).orElseThrow(() -> new ArchiCodeException("unable to read the path %s", path));

            for (Path manifestFile : Arrays.stream(manifestFilesAsArray)
                .map(File::toPath)
                .collect(Collectors.toSet())) {
                log.info("parse the manifest {}", manifestFile);

                val mapper = mapperFactory.create(manifestFile);
                val resource = mapper.readValue(manifestFile.toFile(), Manifest.class);
                val item = ManifestConverter.builder().manifest(resource).mapper(mapper).build().convert();

                if (item instanceof Element element) {
                    val reference = Optional.ofNullable(resource.getHeader().getParent())
                        .map(parentReference -> String.format("%s.%s", parentReference, element.getId()))
                        .orElse(element.getId());
                    val candidate = Candidate.builder()
                        .parent(resource.getHeader().getParent())
                        .reference(reference)
                        .element(element)
                        .build();
                    map.putIfAbsent(resource.getKind().getCategory(), new HashSet<>());
                    map.get(resource.getKind().getCategory()).add(candidate);
                } else if (item instanceof View view) {
                    views.add(view);
                } else if (item instanceof Story story) {
                    stories.add(story);
                }
            }
        }
        return new Parsed(map, views, stories);
    }

    /**
     * What the manifests hold.
     *
     * @param elements the elements, by category (application, technology)
     * @param views    the views that are manifests of their own
     * @param stories  the stories
     */
    public record Parsed(Map<Class<?>, Set<Candidate>> elements, Set<View> views, Set<Story> stories) {}

    @Value
    @Builder
    @Jacksonized
    @ToString(onlyExplicitlyIncluded = true)
    public static class Candidate {

        String parent;

        @NonNull
        @ToString.Include
        String reference;

        @NonNull
        @ToString.Include
        Element element;
    }
}

package io.morin.archicode.manifest;

import io.morin.archicode.resource.element.application.*;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.element.technology.Environment;
import io.morin.archicode.resource.element.technology.Node;
import io.morin.archicode.resource.element.technology.Technology;
import java.util.*;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ManifestKind {
    // APPLICATION
    COMPONENT(Component.class, Application.class),
    CONTAINER(Container.class, Application.class),
    CONTAINER_GROUP(ContainerGroup.class, Application.class),
    PERSON(Person.class, Application.class),
    SOLUTION(Solution.class, Application.class),
    SOLUTION_GROUP(SolutionGroup.class, Application.class),
    SYSTEM(System.class, Application.class),
    SYSTEM_GROUP(SolutionGroup.class, Application.class),
    // TECHNOLOGY
    ENVIRONMENT(Environment.class, Technology.class),
    NODE(Node.class, Technology.class);

    private static final Map<String, List<ManifestKind>> INDEX = Arrays
        .stream(ManifestKind.values())
        .collect(Collectors.groupingBy(ManifestKind::getId));
    private final Class<?> type;
    private final Class<?> category;

    public static Optional<ManifestKind> findById(String id) {
        return INDEX.getOrDefault(id, Collections.emptyList()).stream().findFirst();
    }

    public String getId() {
        return "archicode.morin.io/" + this.name().toLowerCase().replace("_", "-");
    }

    public String getSubTypeName() {
        return this.name().toLowerCase().substring(Math.max(this.name().indexOf("_"), 0));
    }
}
